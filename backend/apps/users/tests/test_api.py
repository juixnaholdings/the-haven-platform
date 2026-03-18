
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
        self.assertEqual(response.data["status"], "success")
        self.assertIn("data", response.data)
        self.assertEqual(response.data["data"]["username"], "admin1")

    def test_me_requires_auth(self):
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["code"], 0)
        self.assertEqual(response.data["status"], "error")

    def test_me_after_login(self):
        self.client.post(
            "/api/auth/login/",
            {"username": "admin1", "password": "StrongPass123"},
            format="json",
        )

        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["username"], "admin1")

    def test_logout(self):
        self.client.post(
            "/api/auth/login/",
            {"username": "admin1", "password": "StrongPass123"},
            format="json",
        )

        response = self.client.post("/api/auth/logout/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["code"], 1)
        self.assertEqual(response.data["status"], "success")