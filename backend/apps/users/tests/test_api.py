from django.contrib.auth.models import Group, Permission
from django.conf import settings
from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken

from apps.users.models import User


class AuthApiTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.login_url = "/api/auth/login/"
        self.signup_url = "/api/auth/signup/"
        self.username_availability_url = "/api/auth/availability/username/"
        self.email_availability_url = "/api/auth/availability/email/"
        self.user = User.objects.create_user(
            username="admin1",
            email="admin1@example.com",
            password="StrongPass123",
        )
        self.user.groups.add(Group.objects.create(name="Church Admin"))

    def test_login_success_with_identifier_username_sets_refresh_cookie_and_returns_access_only(
        self,
    ):
        response = self.client.post(
            self.login_url,
            {"identifier": "admin1", "password": "StrongPass123"},
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

    def test_login_success_with_identifier_email_sets_refresh_cookie_and_returns_access_only(
        self,
    ):
        response = self.client.post(
            self.login_url,
            {"identifier": "  ADMIN1@example.com  ", "password": "StrongPass123"},
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

    def test_login_success_with_legacy_username_payload_remains_supported(self):
        response = self.client.post(
            self.login_url,
            {"username": "admin1", "password": "StrongPass123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["code"], 1)
        self.assertEqual(response.data["status"], "success")
        self.assertIn("tokens", response.data["data"])
        self.assertIn("access", response.data["data"]["tokens"])
        self.assertEqual(response.data["data"]["user"]["username"], "admin1")

    def test_login_fails_for_invalid_identifier(self):
        response = self.client.post(
            self.login_url,
            {"identifier": "not-a-user", "password": "StrongPass123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], 0)
        self.assertEqual(response.data["status"], "error")
        self.assertEqual(response.data["message"], "Validation failed.")
        self.assertEqual(response.data["errors"], {"detail": ["Invalid credentials."]})

    def test_login_fails_for_wrong_password(self):
        response = self.client.post(
            self.login_url,
            {"identifier": "admin1", "password": "WrongPass123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], 0)
        self.assertEqual(response.data["status"], "error")
        self.assertEqual(response.data["message"], "Validation failed.")
        self.assertEqual(response.data["errors"], {"detail": ["Invalid credentials."]})

    def test_login_rejects_ambiguous_identifier_between_username_and_email(self):
        User.objects.create_user(
            username="admin1@example.com",
            email="different-admin@example.com",
            password="AnotherStrongPass123",
        )

        response = self.client.post(
            self.login_url,
            {"identifier": "admin1@example.com", "password": "StrongPass123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], 0)
        self.assertEqual(response.data["status"], "error")
        self.assertEqual(response.data["message"], "Validation failed.")
        self.assertEqual(response.data["errors"], {"detail": ["Invalid credentials."]})

    def test_signup_success_creates_basic_user_with_no_roles_or_privileges(self):
        response = self.client.post(
            self.signup_url,
            {
                "username": "newbasicuser",
                "email": "newbasicuser@example.com",
                "password": "StrongPass123!",
                "confirm_password": "StrongPass123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["code"], 1)
        self.assertEqual(response.data["status"], "success")
        self.assertEqual(response.data["data"]["user"]["username"], "newbasicuser")
        self.assertEqual(response.data["data"]["user"]["email"], "newbasicuser@example.com")
        self.assertEqual(response.data["data"]["user"]["role_names"], [])
        self.assertFalse(response.data["data"]["user"]["is_staff"])
        self.assertFalse(response.data["data"]["user"]["is_superuser"])
        self.assertTrue(response.data["data"]["user"]["is_active"])

        created_user = User.objects.get(username="newbasicuser")
        self.assertFalse(created_user.is_staff)
        self.assertFalse(created_user.is_superuser)
        self.assertTrue(created_user.is_active)
        self.assertEqual(created_user.groups.count(), 0)
        self.assertFalse(created_user.has_perm("users.view_user"))

    def test_signup_rejects_duplicate_username(self):
        response = self.client.post(
            self.signup_url,
            {
                "username": "admin1",
                "email": "new-duplicate-username@example.com",
                "password": "StrongPass123!",
                "confirm_password": "StrongPass123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], 0)
        self.assertEqual(response.data["status"], "error")
        self.assertEqual(response.data["message"], "Validation failed.")
        self.assertEqual(
            response.data["errors"],
            {"username": ["A user with this username already exists."]},
        )

    def test_signup_rejects_duplicate_email(self):
        response = self.client.post(
            self.signup_url,
            {
                "username": "newduplicateemailuser",
                "email": "admin1@example.com",
                "password": "StrongPass123!",
                "confirm_password": "StrongPass123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], 0)
        self.assertEqual(response.data["status"], "error")
        self.assertEqual(response.data["message"], "Validation failed.")
        self.assertEqual(
            response.data["errors"],
            {"email": ["A user with this email already exists."]},
        )

    def test_signup_rejects_weak_password(self):
        response = self.client.post(
            self.signup_url,
            {
                "username": "weakpassworduser",
                "email": "weakpassworduser@example.com",
                "password": "weakpass",
                "confirm_password": "weakpass",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], 0)
        self.assertEqual(response.data["status"], "error")
        self.assertEqual(response.data["message"], "Validation failed.")
        self.assertIn(
            "Password must include at least one uppercase letter.",
            response.data["errors"]["password"],
        )
        self.assertIn(
            "Password must include at least one number.",
            response.data["errors"]["password"],
        )
        self.assertIn(
            "Password must include at least one symbol.",
            response.data["errors"]["password"],
        )

    def test_signup_rejects_password_confirmation_mismatch(self):
        response = self.client.post(
            self.signup_url,
            {
                "username": "mismatchuser",
                "email": "mismatchuser@example.com",
                "password": "StrongPass123!",
                "confirm_password": "StrongPass123?",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], 0)
        self.assertEqual(response.data["status"], "error")
        self.assertEqual(response.data["message"], "Validation failed.")
        self.assertEqual(
            response.data["errors"],
            {"confirm_password": ["Password confirmation does not match."]},
        )

    def test_username_availability_reports_true_when_available(self):
        response = self.client.get(
            self.username_availability_url,
            {"username": "still-available-user"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["code"], 1)
        self.assertEqual(response.data["status"], "success")
        self.assertEqual(response.data["data"]["username"], "still-available-user")
        self.assertTrue(response.data["data"]["available"])

    def test_username_availability_reports_false_when_taken(self):
        response = self.client.get(
            self.username_availability_url,
            {"username": "admin1"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["code"], 1)
        self.assertEqual(response.data["status"], "success")
        self.assertEqual(response.data["data"]["username"], "admin1")
        self.assertFalse(response.data["data"]["available"])

    def test_email_availability_reports_false_when_taken(self):
        response = self.client.get(
            self.email_availability_url,
            {"email": "admin1@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["code"], 1)
        self.assertEqual(response.data["status"], "success")
        self.assertEqual(response.data["data"]["email"], "admin1@example.com")
        self.assertFalse(response.data["data"]["available"])

    def test_email_availability_reports_true_when_available(self):
        response = self.client.get(
            self.email_availability_url,
            {"email": "still.available@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["code"], 1)
        self.assertEqual(response.data["status"], "success")
        self.assertEqual(response.data["data"]["email"], "still.available@example.com")
        self.assertTrue(response.data["data"]["available"])

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
            self.login_url,
            {"identifier": "admin1", "password": "StrongPass123"},
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
            self.login_url,
            {"identifier": "admin1@example.com", "password": "StrongPass123"},
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
            self.login_url,
            {"identifier": "admin1", "password": "StrongPass123"},
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
            self.login_url,
            {"identifier": "admin1", "password": "StrongPass123"},
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
        self.membership_secretary_group = Group.objects.create(name="Membership Secretary")
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
        self.assertEqual(
            response.data["data"][0]["roles"],
            [{"id": self.finance_secretary_group.id, "name": "Finance Secretary"}],
        )

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

    def test_create_staff_user_requires_admin_settings_write_access(self):
        self.client.force_authenticate(user=self.regular_user)

        response = self.client.post(
            "/api/settings/staff-users/",
            {
                "username": "staffnew",
                "email": "staffnew@example.com",
                "password": "StrongPass123",
                "role_ids": [self.finance_secretary_group.id],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["status"], "error")

    def test_create_staff_user_creates_staff_user_and_assigns_roles(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.post(
            "/api/settings/staff-users/",
            {
                "username": "staffnew",
                "email": "staffnew@example.com",
                "first_name": "Samuel",
                "last_name": "Okoro",
                "password": "StrongPass123",
                "role_ids": [
                    self.finance_secretary_group.id,
                    self.membership_secretary_group.id,
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "success")
        self.assertEqual(response.data["data"]["username"], "staffnew")
        self.assertTrue(response.data["data"]["is_staff"])
        self.assertEqual(
            response.data["data"]["role_names"],
            ["Finance Secretary", "Membership Secretary"],
        )

        created_user = User.objects.get(username="staffnew")
        self.assertTrue(created_user.is_staff)
        self.assertEqual(
            set(created_user.groups.values_list("name", flat=True)),
            {"Finance Secretary", "Membership Secretary"},
        )

    def test_update_staff_user_updates_status_and_roles(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.patch(
            f"/api/settings/staff-users/{self.staff_user.id}/",
            {
                "is_active": False,
                "role_ids": [self.membership_secretary_group.id],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "success")
        self.assertFalse(response.data["data"]["is_active"])
        self.assertEqual(response.data["data"]["role_names"], ["Membership Secretary"])

        self.staff_user.refresh_from_db()
        self.assertFalse(self.staff_user.is_active)
        self.assertEqual(
            list(self.staff_user.groups.order_by("name").values_list("name", flat=True)),
            ["Membership Secretary"],
        )

    def test_update_staff_user_returns_not_found_for_non_staff_user(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.patch(
            f"/api/settings/staff-users/{self.regular_user.id}/",
            {"is_active": False},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["status"], "error")
