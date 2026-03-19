from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.households.models import Household
from apps.members.models import Member

User = get_user_model()


class HouseholdAdminApiTests(APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_superuser(
            username="households-admin",
            email="households-admin@example.com",
            password="StrongPass123",
        )
        self.client.force_authenticate(self.admin_user)
        self.household = Household.objects.create(name="Mensah Household", city="Accra")
        self.member = Member.objects.create(first_name="Ama", last_name="Mensah")

    def test_list_and_detail_households(self):
        list_response = self.client.get("/api/households/")
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data["data"]), 1)

        detail_response = self.client.get(f"/api/households/{self.household.id}/")
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_response.data["data"]["name"], "Mensah Household")

    def test_create_household(self):
        response = self.client.post(
            "/api/households/",
            {
                "name": "Boateng Household",
                "city": "Kumasi",
                "is_active": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["data"]["name"], "Boateng Household")
        self.assertTrue(Household.objects.filter(name="Boateng Household").exists())

    def test_add_member_to_household(self):
        response = self.client.post(
            f"/api/households/{self.household.id}/members/",
            {
                "member_id": self.member.id,
                "relationship_to_head": "HEAD",
                "is_head": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data["data"]["members"]), 1)
        self.assertEqual(response.data["data"]["members"][0]["member_id"], self.member.id)

    def test_household_endpoints_require_authentication(self):
        self.client.force_authenticate(user=None)

        response = self.client.get("/api/households/")
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])
