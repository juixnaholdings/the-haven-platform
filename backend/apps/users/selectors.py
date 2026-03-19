from collections.abc import Iterable

from django.contrib.auth import get_user_model

User = get_user_model()


def get_user_by_email(*, email: str):
    return User.objects.filter(email=email).first()


def get_current_user(user):
    return user


def user_has_role(*, user, role_name: str) -> bool:
    if not user or not user.is_authenticated:
        return False
    return user.groups.filter(name=role_name).exists()


def user_has_any_role(*, user, role_names: Iterable[str]) -> bool:
    if not user or not user.is_authenticated:
        return False
    return user.groups.filter(name__in=tuple(role_names)).exists()
