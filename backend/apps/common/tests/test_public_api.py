from rest_framework import status
from rest_framework.test import APITestCase


class HealthCheckPublicApiTests(APITestCase):
    def test_health_check_returns_success(self):
        response = self.client.get("/health/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["status"], "ok")
        self.assertEqual(response.data["data"]["database"], "ok")
