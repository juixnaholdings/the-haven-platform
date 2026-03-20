from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase


class HealthCheckPublicApiTests(APITestCase):
    def test_health_check_returns_success(self):
        response = self.client.get("/health/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["status"], "ok")
        self.assertEqual(response.data["data"]["database"], "ok")

    @override_settings(SECURE_SSL_REDIRECT=True, SECURE_REDIRECT_EXEMPT=[r"^health/$"])
    def test_health_check_is_not_redirected_when_ssl_redirect_is_enabled(self):
        response = self.client.get("/health/", secure=False)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_schema_is_available_with_and_without_trailing_slash(self):
        no_slash_response = self.client.get("/api/schema")
        slash_response = self.client.get("/api/schema/")

        self.assertEqual(no_slash_response.status_code, status.HTTP_200_OK)
        self.assertEqual(slash_response.status_code, status.HTTP_200_OK)
