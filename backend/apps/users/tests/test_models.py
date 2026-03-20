
from django.test import TestCase

from apps.users.models import User


class UserModelTest(TestCase):
    def test_create_user(self):
        user = User.objects.create_user(
            username="admin1",
            email="admin1@example.com",
            password="StrongPass123",
        )

        self.assertEqual(user.username, "admin1")
        self.assertEqual(user.email, "admin1@example.com")
        self.assertTrue(user.check_password("StrongPass123"))