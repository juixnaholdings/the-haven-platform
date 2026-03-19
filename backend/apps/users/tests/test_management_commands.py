import os
from io import StringIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management import CommandError, call_command
from django.test import TestCase

from apps.users.constants import BASELINE_ROLE_NAMES, CHURCH_ADMIN_ROLE
from apps.users.management.commands.seed_superuser import REQUIRED_ENV_VARS

User = get_user_model()


class SetupRolesCommandTests(TestCase):
    def test_setup_roles_creates_expected_groups(self):
        stdout = StringIO()

        call_command("setup_roles", stdout=stdout)

        self.assertCountEqual(Group.objects.values_list("name", flat=True), BASELINE_ROLE_NAMES)

        church_admin = Group.objects.get(name=CHURCH_ADMIN_ROLE)
        self.assertTrue(
            church_admin.permissions.filter(
                content_type__app_label="users",
                codename="view_user",
            ).exists()
        )
        self.assertTrue(
            church_admin.permissions.filter(
                content_type__app_label="auth",
                codename="view_group",
            ).exists()
        )

        output = stdout.getvalue()
        self.assertIn("Summary:", output)
        self.assertIn("members.view_member", output)

    def test_setup_roles_is_idempotent(self):
        call_command("setup_roles")
        group_count = Group.objects.count()
        group_permission_count = Group.permissions.through.objects.count()

        stdout = StringIO()
        call_command("setup_roles", stdout=stdout)

        self.assertEqual(Group.objects.count(), group_count)
        self.assertEqual(Group.permissions.through.objects.count(), group_permission_count)
        self.assertIn("created 0", stdout.getvalue())
        self.assertIn("added 0 permission assignment(s)", stdout.getvalue())


class SeedSuperuserCommandTests(TestCase):
    env_values = {
        "DJANGO_SUPERUSER_USERNAME": "haven-admin",
        "DJANGO_SUPERUSER_EMAIL": "haven-admin@example.com",
        "DJANGO_SUPERUSER_PASSWORD": "StrongPass123",
    }

    def test_seed_superuser_creates_superuser_from_env(self):
        stdout = StringIO()

        with patch.dict(os.environ, self.env_values, clear=False):
            call_command("seed_superuser", stdout=stdout)

        user = User.objects.get(username=self.env_values["DJANGO_SUPERUSER_USERNAME"])
        self.assertEqual(user.email, self.env_values["DJANGO_SUPERUSER_EMAIL"])
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertIn("created", stdout.getvalue())

    def test_seed_superuser_is_idempotent(self):
        with patch.dict(os.environ, self.env_values, clear=False):
            call_command("seed_superuser")
            stdout = StringIO()
            call_command("seed_superuser", stdout=stdout)

        self.assertEqual(
            User.objects.filter(username=self.env_values["DJANGO_SUPERUSER_USERNAME"]).count(),
            1,
        )
        self.assertIn("already exists", stdout.getvalue())

    def test_seed_superuser_requires_env_vars(self):
        empty_required_env = os.environ.copy()
        for env_var in REQUIRED_ENV_VARS:
            empty_required_env.pop(env_var, None)

        expected_message = (
            "Missing required environment variables: "
            + ", ".join(REQUIRED_ENV_VARS)
        )

        with patch.dict(os.environ, empty_required_env, clear=True):
            with self.assertRaisesMessage(CommandError, expected_message):
                call_command("seed_superuser")
