from django.test import TestCase

from apps.members import selectors
from apps.members.models import Member


class MemberSelectorTests(TestCase):
    def test_list_members_supports_search(self):
        Member.objects.create(first_name="Akua", last_name="Sarpong", email="akua@example.com")
        Member.objects.create(first_name="Yaw", last_name="Asare", email="yaw@example.com")

        results = selectors.list_members(filters={"search": "Akua"})

        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first().email, "akua@example.com")
