<<<<<<< HEAD
﻿from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import transaction
=======
from collections.abc import Iterable
from dataclasses import dataclass

from django.conf import settings
from django.contrib.auth import get_user_model, login, logout
from django.contrib.auth.models import Group, Permission
from django.db import transaction
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
>>>>>>> develop

User = get_user_model()


@transaction.atomic
def create_user(*, email: str, password: str, first_name: str = "", last_name: str = ""):
    return User.objects.create_user(
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        is_active=True,
    )


@transaction.atomic
def assign_role(*, user, role_name: str):
    group, _ = Group.objects.get_or_create(name=role_name)
    user.groups.add(group)
    return user
<<<<<<< HEAD
=======


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
>>>>>>> develop
