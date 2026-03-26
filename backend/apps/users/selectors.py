from collections.abc import Iterable

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.db.models import Prefetch

User = get_user_model()


def get_user_by_email(*, email: str):
    return User.objects.filter(email=email).first()


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
