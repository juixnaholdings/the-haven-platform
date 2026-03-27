from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.groups.models import Group
from apps.members.models import Member

User = get_user_model()


class GroupAdminApiTests(APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_superuser(
            username="groups-admin",
            email="groups-admin@example.com",
            password="StrongPass123",
        )
        self.client.force_authenticate(self.admin_user)
        self.group = Group.objects.create(name="Choir")
        self.member = Member.objects.create(first_name="Ama", last_name="Mensah")

    def test_list_and_detail_groups(self):
        list_response = self.client.get("/api/groups/")
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data["data"]), 1)

        detail_response = self.client.get(f"/api/groups/{self.group.id}/")
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_response.data["data"]["name"], "Choir")

    def test_list_groups_supports_optional_pagination(self):
        Group.objects.create(name="Ushering")

        response = self.client.get("/api/groups/?page=1&page_size=1")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["count"], 2)
        self.assertEqual(response.data["data"]["page"], 1)
        self.assertEqual(response.data["data"]["page_size"], 1)
        self.assertEqual(len(response.data["data"]["results"]), 1)

    def test_create_group(self):
        response = self.client.post(
            "/api/groups/",
            {
                "name": "Protocol Team",
                "description": "Frontline hospitality and protocol support.",
                "is_active": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["data"]["name"], "Protocol Team")
        self.assertTrue(Group.objects.filter(name="Protocol Team").exists())

    def test_add_member_to_group_and_update_membership(self):
        create_response = self.client.post(
            f"/api/groups/{self.group.id}/members/",
            {
                "member_id": self.member.id,
                "role_name": "Lead Singer",
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        membership_id = create_response.data["data"]["memberships"][0]["id"]

        update_response = self.client.patch(
            f"/api/groups/{self.group.id}/memberships/{membership_id}/",
            {"role_name": "Music Director"},
            format="json",
        )

        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data["data"]["role_name"], "Music Director")

    def test_group_endpoints_require_authentication(self):
        self.client.force_authenticate(user=None)

        response = self.client.get("/api/groups/")
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_group_endpoints_reject_authenticated_user_without_permissions(self):
        basic_user = User.objects.create_user(
            username="groups-basic",
            email="groups-basic@example.com",
            password="StrongPass123",
        )
        self.client.force_authenticate(basic_user)

        response = self.client.get("/api/groups/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
