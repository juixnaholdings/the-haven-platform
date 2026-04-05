from collections.abc import Iterable
from dataclasses import dataclass
from datetime import timedelta
import secrets

from django.conf import settings
from django.contrib.auth import get_user_model, login, logout
from django.contrib.auth.models import Group, Permission
from django.db import transaction
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from apps.common.audit import AuditEventType, AuditTargetType
from apps.common import services as common_services
from apps.users.constants import ALL_AVAILABLE_PERMISSIONS
from apps.users.models import StaffInvite, StaffInviteStatus


@dataclass(frozen=True)
class RoleSetupResult:
    role_name: str
    created: bool
    added_permissions: tuple[str, ...]
    missing_permissions: tuple[str, ...]


@dataclass(frozen=True)
class SuperuserSeedResult:
    username: str
    created: bool


def login_user(request, user):
    login(request, user)
    return user


def logout_user(request):
    logout(request)


def build_jwt_tokens_for_user(*, user) -> dict[str, str]:
    refresh = RefreshToken.for_user(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


def refresh_access_from_cookie(*, raw_refresh_token: str) -> dict[str, str]:
    serializer = TokenRefreshSerializer(data={"refresh": raw_refresh_token})
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data


def blacklist_refresh_token(*, refresh_token: str) -> None:
    if not refresh_token:
        return

    try:
        token = RefreshToken(refresh_token)
        token.blacklist()
    except TokenError as exc:
        if "blacklisted" in str(exc).lower():
            return
        if "token is invalid or expired" in str(exc).lower():
            return
        raise ValueError("Invalid or expired refresh token.") from exc


def get_refresh_cookie_from_request(*, request) -> str:
    return request.COOKIES.get(settings.AUTH_REFRESH_COOKIE_NAME, "")


def set_refresh_cookie(*, response: Response, refresh_token: str) -> None:
    max_age = int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds())

    cookie_kwargs = {
        "key": settings.AUTH_REFRESH_COOKIE_NAME,
        "value": refresh_token,
        "max_age": max_age,
        "httponly": settings.AUTH_REFRESH_COOKIE_HTTPONLY,
        "secure": settings.AUTH_REFRESH_COOKIE_SECURE,
        "samesite": settings.AUTH_REFRESH_COOKIE_SAMESITE,
        "path": settings.AUTH_REFRESH_COOKIE_PATH,
    }

    if settings.AUTH_REFRESH_COOKIE_DOMAIN:
        cookie_kwargs["domain"] = settings.AUTH_REFRESH_COOKIE_DOMAIN

    response.set_cookie(**cookie_kwargs)


def clear_refresh_cookie(*, response: Response) -> None:
    cookie_kwargs = {
        "key": settings.AUTH_REFRESH_COOKIE_NAME,
        "path": settings.AUTH_REFRESH_COOKIE_PATH,
        "samesite": settings.AUTH_REFRESH_COOKIE_SAMESITE,
    }

    if settings.AUTH_REFRESH_COOKIE_DOMAIN:
        cookie_kwargs["domain"] = settings.AUTH_REFRESH_COOKIE_DOMAIN

    response.delete_cookie(**cookie_kwargs)


def _normalize_email(value: str) -> str:
    return value.strip().lower()


def normalize_email(value: str) -> str:
    return _normalize_email(value)


def normalize_username(value: str) -> str:
    return value.strip()


def _generate_invite_token() -> str:
    return secrets.token_urlsafe(32)


def build_staff_invite_path(*, staff_invite: StaffInvite) -> str:
    if not staff_invite.token:
        return ""
    return f"/staff-invite/{staff_invite.id}?token={staff_invite.token}"


def _validate_unique_username(*, username: str, exclude_user_id: int | None = None) -> None:
    User = get_user_model()
    queryset = User.objects.filter(username__iexact=username)
    if exclude_user_id is not None:
        queryset = queryset.exclude(id=exclude_user_id)

    if queryset.exists():
        raise ValidationError({"username": ["A user with this username already exists."]})


def _validate_unique_email(*, email: str, exclude_user_id: int | None = None) -> None:
    if not email:
        return

    User = get_user_model()
    queryset = User.objects.filter(email__iexact=email)
    if exclude_user_id is not None:
        queryset = queryset.exclude(id=exclude_user_id)

    if queryset.exists():
        raise ValidationError({"email": ["A user with this email already exists."]})


@transaction.atomic
def create_public_user(
    *,
    username: str,
    email: str,
    password: str,
    is_active: bool = True,
) -> object:
    User = get_user_model()

    normalized_username = normalize_username(username)
    normalized_email = _normalize_email(email)

    _validate_unique_username(username=normalized_username)
    _validate_unique_email(email=normalized_email)

    user = User.objects.create_user(
        username=normalized_username,
        email=normalized_email,
        password=password,
        is_active=is_active,
        is_staff=False,
        is_superuser=False,
    )
    user.groups.clear()
    return User.objects.prefetch_related("groups").get(id=user.id)


@transaction.atomic
def create_staff_user(*, data: dict, actor=None) -> object:
    User = get_user_model()
    payload = data.copy()

    role_groups = payload.pop("role_ids", [])
    raw_username = payload.pop("username")
    raw_email = payload.pop("email")
    password = payload.pop("password")

    username = normalize_username(raw_username)
    email = _normalize_email(raw_email)

    _validate_unique_username(username=username)
    _validate_unique_email(email=email)

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=payload.get("first_name", ""),
        last_name=payload.get("last_name", ""),
        is_active=payload.get("is_active", True),
        is_staff=True,
    )
    user.groups.set(role_groups)

    user = User.objects.prefetch_related("groups").get(id=user.id)

    common_services.log_audit_event(
        actor=actor,
        event_type=AuditEventType.STAFF_USER_CREATED,
        target_type=AuditTargetType.STAFF_USER,
        target_id=user.id,
        summary=f"Created staff user '{user.username}'.",
        payload={
            "username": user.username,
            "is_active": user.is_active,
            "role_names": sorted(user.groups.values_list("name", flat=True)),
        },
    )

    return user


@transaction.atomic
def update_staff_user(*, user, data: dict, actor=None) -> object:
    payload = data.copy()
    role_groups = payload.pop("role_ids", None)
    changed_fields = sorted(payload.keys())
    previous_role_names = sorted(user.groups.values_list("name", flat=True))

    if "email" in payload:
        payload["email"] = _normalize_email(payload["email"])
        _validate_unique_email(email=payload["email"], exclude_user_id=user.id)

    for field in ("first_name", "last_name", "email", "is_active"):
        if field in payload:
            setattr(user, field, payload[field])

    # Staff management endpoints are intentionally scoped to staff users only.
    user.is_staff = True
    user.save()

    if role_groups is not None:
        user.groups.set(role_groups)

    User = get_user_model()
    user = User.objects.prefetch_related("groups").get(id=user.id)
    current_role_names = sorted(user.groups.values_list("name", flat=True))

    common_services.log_audit_event(
        actor=actor,
        event_type=AuditEventType.STAFF_USER_UPDATED,
        target_type=AuditTargetType.STAFF_USER,
        target_id=user.id,
        summary=f"Updated staff user '{user.username}'.",
        payload={
            "username": user.username,
            "changed_fields": changed_fields,
            "is_active": user.is_active,
        },
    )

    if role_groups is not None and current_role_names != previous_role_names:
        common_services.log_audit_event(
            actor=actor,
            event_type=AuditEventType.STAFF_ROLE_ASSIGNMENT_UPDATED,
            target_type=AuditTargetType.STAFF_USER,
            target_id=user.id,
            summary=f"Updated role assignments for staff user '{user.username}'.",
            payload={
                "username": user.username,
                "previous_role_names": previous_role_names,
                "current_role_names": current_role_names,
            },
        )

    return user


def expire_pending_staff_invites(*, reference_time=None) -> int:
    resolved_reference_time = reference_time or timezone.now()
    return StaffInvite.objects.filter(
        status=StaffInviteStatus.PENDING,
        expires_at__lt=resolved_reference_time,
    ).update(
        status=StaffInviteStatus.EXPIRED,
        updated_at=resolved_reference_time,
    )


@transaction.atomic
def elevate_basic_user_to_staff(*, user, data: dict, actor=None):
    if user.is_superuser:
        raise ValidationError({"detail": ["Superusers cannot be elevated through this flow."]})
    if user.is_staff:
        raise ValidationError({"detail": ["This user is already staff."]})

    role_groups = data.get("role_ids") or []
    if not role_groups:
        raise ValidationError({"role_ids": ["Assign at least one role before elevation."]})

    if "is_active" in data:
        user.is_active = data["is_active"]
    user.is_staff = True
    user.save(update_fields=["is_active", "is_staff"] if "is_active" in data else ["is_staff"])
    user.groups.set(role_groups)

    User = get_user_model()
    user = User.objects.prefetch_related("groups").get(id=user.id)

    common_services.log_audit_event(
        actor=actor,
        event_type=AuditEventType.STAFF_USER_ELEVATED,
        target_type=AuditTargetType.STAFF_USER,
        target_id=user.id,
        summary=f"Elevated basic user '{user.username}' to staff access.",
        payload={
            "username": user.username,
            "is_active": user.is_active,
            "role_names": sorted(user.groups.values_list("name", flat=True)),
        },
    )
    return user


@transaction.atomic
def create_staff_invite(*, data: dict, actor=None) -> StaffInvite:
    expire_pending_staff_invites()

    payload = data.copy()
    raw_email = payload.pop("email")
    role_groups = payload.pop("role_ids", [])
    expires_in_days = payload.pop("expires_in_days", 7)

    if not role_groups:
        raise ValidationError({"role_ids": ["Assign at least one role to create an invite."]})

    email = _normalize_email(raw_email)

    User = get_user_model()
    existing_user = User.objects.filter(email__iexact=email).first()
    if existing_user is not None:
        if existing_user.is_staff or existing_user.is_superuser:
            raise ValidationError({"email": ["A staff account with this email already exists."]})
        raise ValidationError(
            {
                "email": [
                    "A basic account with this email already exists. Use the elevation workflow instead."
                ]
            }
        )

    pending_invite = StaffInvite.objects.filter(
        email__iexact=email,
        status=StaffInviteStatus.PENDING,
        expires_at__gte=timezone.now(),
    ).first()
    if pending_invite is not None:
        raise ValidationError({"email": ["A pending invite for this email already exists."]})

    invite = StaffInvite.objects.create(
        email=email,
        token=_generate_invite_token(),
        status=StaffInviteStatus.PENDING,
        expires_at=timezone.now() + timedelta(days=expires_in_days),
        created_by=actor if getattr(actor, "is_authenticated", False) else None,
        updated_by=actor if getattr(actor, "is_authenticated", False) else None,
    )
    invite.role_groups.set(role_groups)
    invite = StaffInvite.objects.select_related("accepted_user", "created_by").prefetch_related(
        "role_groups"
    ).get(id=invite.id)

    common_services.log_audit_event(
        actor=actor,
        event_type=AuditEventType.STAFF_INVITE_CREATED,
        target_type=AuditTargetType.STAFF_INVITE,
        target_id=invite.id,
        summary=f"Created staff invite for '{invite.email}'.",
        payload={
            "email": invite.email,
            "expires_at": invite.expires_at.isoformat(),
            "role_names": sorted(invite.role_groups.values_list("name", flat=True)),
        },
    )
    return invite


@transaction.atomic
def resend_staff_invite(*, staff_invite: StaffInvite, data: dict, actor=None) -> StaffInvite:
    expire_pending_staff_invites()

    if staff_invite.status == StaffInviteStatus.ACCEPTED:
        raise ValidationError({"detail": ["Accepted invites cannot be resent."]})

    expires_in_days = data.get("expires_in_days", 7)
    now = timezone.now()

    User = get_user_model()
    existing_user = User.objects.filter(email__iexact=staff_invite.email).first()
    if existing_user is not None:
        if existing_user.is_staff or existing_user.is_superuser:
            raise ValidationError(
                {"email": ["A staff account with this email already exists."]}
            )
        raise ValidationError(
            {
                "email": [
                    "A basic account with this email already exists. Use the elevation workflow instead."
                ]
            }
        )

    conflicting_pending_invite = (
        StaffInvite.objects.filter(
            email__iexact=staff_invite.email,
            status=StaffInviteStatus.PENDING,
            expires_at__gte=now,
        )
        .exclude(id=staff_invite.id)
        .exists()
    )
    if conflicting_pending_invite:
        raise ValidationError(
            {"email": ["Another pending invite for this email already exists."]}
        )

    previous_status = staff_invite.status
    previous_expires_at = staff_invite.expires_at

    staff_invite.status = StaffInviteStatus.PENDING
    staff_invite.token = _generate_invite_token()
    staff_invite.expires_at = now + timedelta(days=expires_in_days)
    staff_invite.updated_by = actor if getattr(actor, "is_authenticated", False) else None
    staff_invite.save(
        update_fields=["status", "token", "expires_at", "updated_by", "updated_at"]
    )
    staff_invite = StaffInvite.objects.select_related("accepted_user", "created_by").prefetch_related(
        "role_groups"
    ).get(id=staff_invite.id)

    common_services.log_audit_event(
        actor=actor,
        event_type=AuditEventType.STAFF_INVITE_RESENT,
        target_type=AuditTargetType.STAFF_INVITE,
        target_id=staff_invite.id,
        summary=f"Resent staff invite for '{staff_invite.email}'.",
        payload={
            "email": staff_invite.email,
            "previous_status": previous_status,
            "previous_expires_at": previous_expires_at.isoformat(),
            "expires_at": staff_invite.expires_at.isoformat(),
            "role_names": sorted(staff_invite.role_groups.values_list("name", flat=True)),
        },
    )

    return staff_invite


@transaction.atomic
def revoke_staff_invite(*, staff_invite: StaffInvite, actor=None) -> StaffInvite:
    if staff_invite.status == StaffInviteStatus.ACCEPTED:
        raise ValidationError({"detail": ["Accepted invites cannot be revoked."]})

    if staff_invite.status == StaffInviteStatus.REVOKED:
        return staff_invite

    if (
        staff_invite.status == StaffInviteStatus.PENDING
        and staff_invite.expires_at < timezone.now()
    ):
        staff_invite.status = StaffInviteStatus.EXPIRED
        staff_invite.updated_by = actor if getattr(actor, "is_authenticated", False) else None
        staff_invite.save(update_fields=["status", "updated_by", "updated_at"])
        return staff_invite

    staff_invite.status = StaffInviteStatus.REVOKED
    staff_invite.updated_by = actor if getattr(actor, "is_authenticated", False) else None
    staff_invite.save(update_fields=["status", "updated_by", "updated_at"])

    common_services.log_audit_event(
        actor=actor,
        event_type=AuditEventType.STAFF_INVITE_REVOKED,
        target_type=AuditTargetType.STAFF_INVITE,
        target_id=staff_invite.id,
        summary=f"Revoked staff invite for '{staff_invite.email}'.",
        payload={"email": staff_invite.email},
    )
    return staff_invite


def assert_staff_invite_is_actionable(*, staff_invite: StaffInvite) -> StaffInvite:
    if not staff_invite:
        raise ValidationError({"detail": ["Staff invite was not found."]})

    if (
        staff_invite.status == StaffInviteStatus.PENDING
        and staff_invite.expires_at < timezone.now()
    ):
        staff_invite.status = StaffInviteStatus.EXPIRED
        staff_invite.save(update_fields=["status", "updated_at"])

    if staff_invite.status == StaffInviteStatus.REVOKED:
        raise ValidationError({"detail": ["This invite has been revoked."]})
    if staff_invite.status == StaffInviteStatus.EXPIRED:
        raise ValidationError({"detail": ["This invite has expired."]})
    if staff_invite.status == StaffInviteStatus.ACCEPTED:
        raise ValidationError({"detail": ["This invite has already been accepted."]})
    if not staff_invite.token:
        raise ValidationError({"detail": ["This invite link is no longer active."]})

    return staff_invite


@transaction.atomic
def accept_staff_invite(*, staff_invite: StaffInvite, data: dict) -> object:
    if staff_invite.status != StaffInviteStatus.PENDING:
        raise ValidationError({"detail": ["This invite can no longer be accepted."]})

    User = get_user_model()
    if User.objects.filter(email__iexact=staff_invite.email).exists():
        raise ValidationError(
            {
                "email": [
                    "An account with this email already exists. Ask an admin to use the elevation workflow."
                ]
            }
        )

    username = normalize_username(data["username"])
    _validate_unique_username(username=username)

    user = User.objects.create_user(
        username=username,
        email=staff_invite.email,
        password=data["password"],
        first_name=data.get("first_name", ""),
        last_name=data.get("last_name", ""),
        is_active=True,
        is_staff=True,
        is_superuser=False,
    )
    user.groups.set(staff_invite.role_groups.all())
    user = User.objects.prefetch_related("groups").get(id=user.id)

    accepted_at = timezone.now()
    staff_invite.status = StaffInviteStatus.ACCEPTED
    staff_invite.accepted_at = accepted_at
    staff_invite.accepted_user = user
    staff_invite.token = None
    staff_invite.updated_by = user
    staff_invite.save(
        update_fields=[
            "status",
            "accepted_at",
            "accepted_user",
            "token",
            "updated_by",
            "updated_at",
        ]
    )

    common_services.log_audit_event(
        actor=user,
        event_type=AuditEventType.STAFF_INVITE_ACCEPTED,
        target_type=AuditTargetType.STAFF_INVITE,
        target_id=staff_invite.id,
        summary=f"Accepted staff invite for '{staff_invite.email}'.",
        payload={
            "email": staff_invite.email,
            "username": user.username,
            "role_names": sorted(user.groups.values_list("name", flat=True)),
        },
    )

    return user


def _permission_label(permission: Permission) -> str:
    return f"{permission.content_type.app_label}.{permission.codename}"


def _permission_lookup() -> dict[str, Permission]:
    permissions = Permission.objects.select_related("content_type").order_by(
        "content_type__app_label",
        "codename",
    )
    return {_permission_label(permission): permission for permission in permissions}


def _normalize_permission_labels(permission_labels: Iterable[str]) -> tuple[str, ...]:
    return tuple(dict.fromkeys(permission_labels))


def resolve_permissions(
    *, permission_labels: Iterable[str] | str
) -> tuple[list[Permission], tuple[str, ...]]:
    lookup = _permission_lookup()

    if permission_labels == ALL_AVAILABLE_PERMISSIONS:
        return list(lookup.values()), ()

    normalized_labels = _normalize_permission_labels(permission_labels)
    resolved_permissions = []
    missing_permissions = []

    for label in normalized_labels:
        permission = lookup.get(label)
        if permission is None:
            missing_permissions.append(label)
            continue
        resolved_permissions.append(permission)

    return resolved_permissions, tuple(missing_permissions)


@transaction.atomic
def setup_role_group(*, role_name: str, permission_labels: Iterable[str] | str) -> RoleSetupResult:
    group, created = Group.objects.get_or_create(name=role_name)
    resolved_permissions, missing_permissions = resolve_permissions(
        permission_labels=permission_labels
    )

    existing_permission_ids = set(group.permissions.values_list("id", flat=True))
    added_permissions = [
        permission
        for permission in resolved_permissions
        if permission.id not in existing_permission_ids
    ]
    if added_permissions:
        group.permissions.add(*added_permissions)

    return RoleSetupResult(
        role_name=role_name,
        created=created,
        added_permissions=tuple(_permission_label(permission) for permission in added_permissions),
        missing_permissions=missing_permissions,
    )


@transaction.atomic
def seed_superuser(*, username: str, email: str, password: str) -> SuperuserSeedResult:
    User = get_user_model()

    existing_user = User.objects.filter(username=username).first()
    if existing_user is not None:
        if not existing_user.is_superuser:
            raise ValueError(f"User '{username}' already exists and is not a superuser.")
        return SuperuserSeedResult(username=username, created=False)

    conflicting_email_user = User.objects.filter(email=email).first()
    if conflicting_email_user is not None:
        raise ValueError(
            f"User with email '{email}' already exists under username "
            f"'{conflicting_email_user.username}'."
        )

    User.objects.create_superuser(username=username, email=email, password=password)
    return SuperuserSeedResult(username=username, created=True)
