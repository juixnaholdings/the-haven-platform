from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.members.models import Member

User = get_user_model()


class MemberAdminApiTests(APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_superuser(
            username="members-admin",
            email="members-admin@example.com",
            password="StrongPass123",
        )
        self.client.force_authenticate(self.admin_user)
        self.member = Member.objects.create(
            first_name="Ama",
            last_name="Mensah",
            email="ama@example.com",
            phone_number="233000000001",
        )

    def test_list_members(self):
        response = self.client.get("/api/members/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["code"], 1)
        self.assertEqual(len(response.data["data"]), 1)

    def test_create_member(self):
        response = self.client.post(
            "/api/members/",
            {
                "first_name": "Kojo",
                "last_name": "Boateng",
                "email": "kojo@example.com",
                "phone_number": "233000000002",
                "is_active": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["data"]["first_name"], "Kojo")
        self.assertTrue(Member.objects.filter(email="kojo@example.com").exists())

    def test_retrieve_and_update_member(self):
        detail_response = self.client.get(f"/api/members/{self.member.id}/")
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_response.data["data"]["last_name"], "Mensah")

        update_response = self.client.patch(
            f"/api/members/{self.member.id}/",
            {"phone_number": "233000000999"},
            format="json",
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.member.refresh_from_db()
        self.assertEqual(self.member.phone_number, "233000000999")

    def test_member_endpoints_require_authentication(self):
        self.client.force_authenticate(user=None)

        response = self.client.get("/api/members/")
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])
