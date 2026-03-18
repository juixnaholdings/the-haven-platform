from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.models import User


class AuthApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="admin1",
            email="admin1@example.com",
            password="StrongPass123",
        )

    def test_login_success(self):
        response = self.client.post(
            "/api/auth/login/",
            {"username": "admin1", "password": "StrongPass123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["code"], 1)
        self.assertIn("tokens", response.data["data"])
        self.assertEqual(response.data["data"]["user"]["username"], "admin1")

    def test_me_requires_auth(self):
        response = self.client.get("/api/auth/me/")
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])
        self.assertEqual(response.data["code"], 0)

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

    def test_refresh_token(self):
        login_response = self.client.post(
            "/api/auth/login/",
            {"username": "admin1", "password": "StrongPass123"},
            format="json",
        )

        refresh = login_response.data["data"]["tokens"]["refresh"]

        response = self.client.post(
            "/api/auth/token/refresh/",
            {"refresh": refresh},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["code"], 1)
        self.assertIn("access", response.data["data"])

    def test_logout_blacklists_refresh_token(self):
        login_response = self.client.post(
            "/api/auth/login/",
            {"username": "admin1", "password": "StrongPass123"},
            format="json",
        )

        access = login_response.data["data"]["tokens"]["access"]
        refresh = login_response.data["data"]["tokens"]["refresh"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        response = self.client.post(
            "/api/auth/logout/",
            {"refresh": refresh},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["code"], 1)