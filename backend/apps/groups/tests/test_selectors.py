from django.test import TestCase

from apps.groups import selectors, services
from apps.members.models import Member


class GroupSelectorTests(TestCase):
    def test_list_member_groups_returns_member_affiliations(self):
        group = services.create_group(data={"name": "Choir", "description": "", "is_active": True})
        member = Member.objects.create(first_name="Ama", last_name="Mensah")
        services.add_member_to_group(group=group, member=member, role_name="Member")

        memberships = selectors.list_member_groups(member_id=member.id)

        self.assertEqual(memberships.count(), 1)
        self.assertEqual(memberships.first().group, group)
