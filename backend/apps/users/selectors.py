from collections.abc import Iterable

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.db.models import Count, Prefetch, Q
from django.utils import timezone

from apps.users.models import StaffInvite, StaffInviteStatus

User = get_user_model()


def get_user_by_email(*, email: str):
    return User.objects.filter(email=email).first()


def is_username_available(*, username: str) -> bool:
    normalized_username = username.strip()
    if not normalized_username:
        return False

    return not User.objects.filter(username__iexact=normalized_username).exists()


def is_email_available(*, email: str) -> bool:
    normalized_email = email.strip().lower()
    if not normalized_email:
        return False

    return not User.objects.filter(email__iexact=normalized_email).exists()


def get_current_user(user):
    return user


def get_user_role_names(*, user) -> list[str]:
    if not user or not user.is_authenticated:
        return []

    prefetched_groups = getattr(user, "_prefetched_objects_cache", {}).get("groups")
    if prefetched_groups is not None:
        return sorted(group.name for group in prefetched_groups)

    return list(user.groups.order_by("name").values_list("name", flat=True))


def user_has_role(*, user, role_name: str) -> bool:
    if not user or not user.is_authenticated:
        return False
    return user.groups.filter(name=role_name).exists()


def user_has_any_role(*, user, role_names: Iterable[str]) -> bool:
    if not user or not user.is_authenticated:
        return False
    return user.groups.filter(name__in=tuple(role_names)).exists()


def user_has_all_permissions(*, user, permissions: Iterable[str]) -> bool:
    if not user or not user.is_authenticated:
        return False
    return all(user.has_perm(permission) for permission in permissions)


def list_staff_users():
    return User.objects.filter(is_staff=True).prefetch_related("groups").order_by(
        "first_name",
        "last_name",
        "username",
    )


def get_staff_user_by_id(*, staff_user_id: int):
    return (
        User.objects.filter(id=staff_user_id, is_staff=True)
        .prefetch_related("groups")
        .first()
    )


def list_basic_users(*, filters: dict | None = None):
    filters = filters or {}
    queryset = User.objects.filter(is_staff=False, is_superuser=False).prefetch_related("groups")

    search = filters.get("search")
    if search:
        queryset = queryset.filter(
            Q(username__icontains=search)
            | Q(email__icontains=search)
            | Q(first_name__icontains=search)
            | Q(last_name__icontains=search)
        )

    is_active = filters.get("is_active")
    if is_active is not None:
        queryset = queryset.filter(is_active=is_active)

    unassigned_only = filters.get("unassigned_only")
    if unassigned_only is None or unassigned_only:
        queryset = queryset.annotate(role_count=Count("groups", distinct=True)).filter(role_count=0)

    return queryset.order_by("first_name", "last_name", "username")


def get_basic_user_by_id(*, user_id: int):
    return (
        User.objects.filter(id=user_id, is_staff=False, is_superuser=False)
        .prefetch_related("groups")
        .first()
    )


def list_staff_invites(*, filters: dict | None = None):
    filters = filters or {}
    queryset = StaffInvite.objects.select_related(
        "accepted_user",
        "created_by",
    ).prefetch_related("role_groups")

    status = filters.get("status")
    if status:
        queryset = queryset.filter(status=status)

    search = filters.get("search")
    if search:
        queryset = queryset.filter(
            Q(email__icontains=search)
            | Q(accepted_user__username__icontains=search)
            | Q(accepted_user__email__icontains=search)
        )

    include_expired = filters.get("include_expired")
    if include_expired is False:
        queryset = queryset.exclude(
            status=StaffInviteStatus.PENDING,
            expires_at__lt=timezone.now(),
        )

    return queryset.order_by("-created_at", "-id")


def get_staff_invite_by_id(*, staff_invite_id: int):
    return (
        StaffInvite.objects.select_related("accepted_user", "created_by")
        .prefetch_related("role_groups")
        .filter(id=staff_invite_id)
        .first()
    )


def get_staff_invite_for_token(*, staff_invite_id: int, token: str):
    return (
        StaffInvite.objects.select_related("accepted_user", "created_by")
        .prefetch_related("role_groups")
        .filter(id=staff_invite_id, token=token)
        .first()
    )


def list_role_summaries():
    return Group.objects.order_by("name").prefetch_related(
        "user_set",
        Prefetch(
            "permissions",
            queryset=Permission.objects.select_related("content_type").order_by(
                "content_type__app_label",
                "codename",
            ),
        ),
    )
