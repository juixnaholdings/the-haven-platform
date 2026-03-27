from collections.abc import Iterable
from dataclasses import dataclass

from django.conf import settings
from django.contrib.auth import get_user_model, login, logout
from django.contrib.auth.models import Group, Permission
from django.db import transaction
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from apps.common.audit import AuditEventType, AuditTargetType
from apps.common import services as common_services
from apps.users.constants import ALL_AVAILABLE_PERMISSIONS


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
def create_staff_user(*, data: dict, actor=None) -> object:
    User = get_user_model()
    payload = data.copy()

    role_groups = payload.pop("role_ids", [])
    raw_username = payload.pop("username")
    raw_email = payload.pop("email")
    password = payload.pop("password")

    username = raw_username.strip()
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
