from django.test import TestCase

from apps.households import selectors, services
from apps.members.models import Member


class HouseholdSelectorTests(TestCase):
    def test_get_household_detail_with_members(self):
        household = services.create_household(data={"name": "Mensah Household", "city": "Accra"})
        member = Member.objects.create(first_name="Ama", last_name="Mensah")
        services.add_member_to_household(household=household, member=member)

        detail = selectors.get_household_detail_with_members(household_id=household.id)

        self.assertIsNotNone(detail)
        self.assertEqual(detail.memberships.count(), 1)
        self.assertEqual(detail.memberships.first().member, member)
