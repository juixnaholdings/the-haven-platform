from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import transaction

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
