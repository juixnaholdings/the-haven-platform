from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.members import services

User = get_user_model()


class MemberServiceTests(TestCase):
    def setUp(self):
        self.actor = User.objects.create_superuser(
            username="member-service-admin",
            email="member-service-admin@example.com",
            password="StrongPass123",
        )

    def test_create_member(self):
        member = services.create_member(
            data={
                "first_name": "Efua",
                "last_name": "Owusu",
                "email": "efua@example.com",
                "phone_number": "233000000010",
                "is_active": True,
            },
            actor=self.actor,
        )

        self.assertEqual(member.first_name, "Efua")
        self.assertEqual(member.created_by, self.actor)
        self.assertEqual(member.updated_by, self.actor)
