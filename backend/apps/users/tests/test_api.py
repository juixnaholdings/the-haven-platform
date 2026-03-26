from django.contrib.auth.models import Group, Permission
from django.conf import settings
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken

from apps.users.models import User


class AuthApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="admin1",
            email="admin1@example.com",
            password="StrongPass123",
        )
        self.user.groups.add(Group.objects.create(name="Church Admin"))

    def test_login_success_sets_refresh_cookie_and_returns_access_only(self):
        response = self.client.post(
            "/api/auth/login/",
            {"username": "admin1", "password": "StrongPass123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["code"], 1)
        self.assertEqual(response.data["status"], "success")
        self.assertIn("tokens", response.data["data"])
        self.assertIn("access", response.data["data"]["tokens"])
        self.assertNotIn("refresh", response.data["data"]["tokens"])
        self.assertEqual(response.data["data"]["user"]["username"], "admin1")
        self.assertEqual(response.data["data"]["user"]["role_names"], ["Church Admin"])

        refresh_cookie = response.cookies.get(settings.AUTH_REFRESH_COOKIE_NAME)
        self.assertIsNotNone(refresh_cookie)
        self.assertTrue(refresh_cookie["httponly"])

    def test_me_requires_auth(self):
        response = self.client.get("/api/auth/me/")

        self.assertIn(
            response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
        )
        self.assertEqual(response.data["code"], 0)
        self.assertEqual(response.data["status"], "error")
        self.assertEqual(response.data["data"], {})
        self.assertEqual(response.data["errors"], {})

    def test_me_with_access_token(self):
        login_response = self.client.post(
            "/api/auth/login/",
            {"username": "admin1", "password": "StrongPass123"},
            format="json",
        )

        access = login_response.data["data"]["tokens"]["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["username"], "admin1")
        self.assertEqual(response.data["data"]["role_names"], ["Church Admin"])

    def test_refresh_token_uses_cookie(self):
        login_response = self.client.post(
            "/api/auth/login/",
            {"username": "admin1", "password": "StrongPass123"},
            format="json",
        )

        refresh_cookie = login_response.cookies[settings.AUTH_REFRESH_COOKIE_NAME].value
        self.client.cookies[settings.AUTH_REFRESH_COOKIE_NAME] = refresh_cookie

        response = self.client.post(
            "/api/auth/token/refresh/",
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["code"], 1)
        self.assertEqual(response.data["status"], "success")
        self.assertIn("access", response.data["data"])
        self.assertNotIn("refresh", response.data["data"])

    def test_verify_token(self):
        login_response = self.client.post(
            "/api/auth/login/",
            {"username": "admin1", "password": "StrongPass123"},
            format="json",
        )

        access = login_response.data["data"]["tokens"]["access"]

        response = self.client.post(
            "/api/auth/token/verify/",
            {"token": access},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["code"], 1)
        self.assertEqual(response.data["status"], "success")
        self.assertEqual(response.data["data"], {})

    def test_logout_blacklists_refresh_token_from_cookie(self):
        login_response = self.client.post(
            "/api/auth/login/",
            {"username": "admin1", "password": "StrongPass123"},
            format="json",
        )

        refresh = login_response.cookies[settings.AUTH_REFRESH_COOKIE_NAME].value
        self.client.cookies[settings.AUTH_REFRESH_COOKIE_NAME] = refresh

        response = self.client.post(
            "/api/auth/logout/",
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["code"], 1)
        self.assertTrue(BlacklistedToken.objects.filter(token__token=refresh).exists())


class SettingsApiTests(APITestCase):
    def setUp(self):
        self.church_admin_group = Group.objects.create(name="Church Admin")
        self.finance_secretary_group = Group.objects.create(name="Finance Secretary")
        self.church_admin_group.permissions.add(
            Permission.objects.get(codename="view_user", content_type__app_label="users")
        )

        self.admin_user = User.objects.create_user(
            username="churchadmin",
            email="churchadmin@example.com",
            password="StrongPass123",
        )
        self.admin_user.groups.add(self.church_admin_group)

        self.staff_user = User.objects.create_user(
            username="staffuser",
            email="staffuser@example.com",
            password="StrongPass123",
            first_name="Grace",
            last_name="Adewale",
            is_staff=True,
        )
        self.staff_user.groups.add(self.finance_secretary_group)

        self.regular_user = User.objects.create_user(
            username="member1",
            email="member1@example.com",
            password="StrongPass123",
        )

    def test_staff_users_requires_admin_settings_access(self):
        self.client.force_authenticate(user=self.regular_user)

        response = self.client.get("/api/settings/staff-users/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["status"], "error")

    def test_staff_users_returns_role_aware_staff_directory(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get("/api/settings/staff-users/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "success")
        self.assertEqual(len(response.data["data"]), 1)
        self.assertEqual(response.data["data"][0]["username"], "staffuser")
        self.assertEqual(response.data["data"][0]["full_name"], "Grace Adewale")
        self.assertEqual(response.data["data"][0]["role_names"], ["Finance Secretary"])

    def test_roles_returns_role_permissions_and_user_counts(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get("/api/settings/roles/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "success")
        role_names = [role["name"] for role in response.data["data"]]
        self.assertIn("Church Admin", role_names)
        self.assertIn("Finance Secretary", role_names)

        church_admin_role = next(
            role for role in response.data["data"] if role["name"] == "Church Admin"
        )
        self.assertEqual(church_admin_role["user_count"], 1)
        self.assertIn(
            "users.view_user",
            [permission["permission_code"] for permission in church_admin_role["permissions"]],
        )
