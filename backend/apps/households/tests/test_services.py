from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.exceptions import ValidationError

from apps.households import services
from apps.households.models import HouseholdRelationship
from apps.members.models import Member

User = get_user_model()


class HouseholdServiceTests(TestCase):
    def setUp(self):
        self.actor = User.objects.create_superuser(
            username="household-service-admin",
            email="household-service-admin@example.com",
            password="StrongPass123",
        )
        self.member_one = Member.objects.create(first_name="Ama", last_name="Mensah")
        self.member_two = Member.objects.create(first_name="Kojo", last_name="Mensah")

    def test_create_household(self):
        household = services.create_household(
            data={"name": "Mensah Household", "city": "Accra", "is_active": True},
            actor=self.actor,
        )

        self.assertEqual(household.name, "Mensah Household")
        self.assertEqual(household.created_by, self.actor)

    def test_add_member_to_household(self):
        household = services.create_household(
            data={"name": "Mensah Household", "city": "Accra", "is_active": True},
            actor=self.actor,
        )

        membership = services.add_member_to_household(
            household=household,
            member=self.member_one,
            relationship_to_head=HouseholdRelationship.HEAD,
            is_head=True,
            actor=self.actor,
        )

        self.assertEqual(membership.household, household)
        self.assertTrue(membership.is_head)

    def test_cannot_add_member_to_conflicting_active_household_memberships(self):
        household_one = services.create_household(
            data={"name": "Mensah Household", "city": "Accra", "is_active": True},
            actor=self.actor,
        )
        household_two = services.create_household(
            data={"name": "Boateng Household", "city": "Tema", "is_active": True},
            actor=self.actor,
        )

        services.add_member_to_household(
            household=household_one,
            member=self.member_one,
            actor=self.actor,
        )

        with self.assertRaises(ValidationError):
            services.add_member_to_household(
                household=household_two,
                member=self.member_one,
                actor=self.actor,
            )

    def test_cannot_create_multiple_household_heads_in_one_household(self):
        household = services.create_household(
            data={"name": "Mensah Household", "city": "Accra", "is_active": True},
            actor=self.actor,
        )

        services.add_member_to_household(
            household=household,
            member=self.member_one,
            relationship_to_head=HouseholdRelationship.HEAD,
            is_head=True,
            actor=self.actor,
        )

        with self.assertRaises(ValidationError):
            services.add_member_to_household(
                household=household,
                member=self.member_two,
                relationship_to_head=HouseholdRelationship.HEAD,
                is_head=True,
                actor=self.actor,
            )

    def test_set_household_head_switches_active_head(self):
        household = services.create_household(
            data={"name": "Mensah Household", "city": "Accra", "is_active": True},
            actor=self.actor,
        )
        first_membership = services.add_member_to_household(
            household=household,
            member=self.member_one,
            relationship_to_head=HouseholdRelationship.HEAD,
            is_head=True,
            actor=self.actor,
        )
        second_membership = services.add_member_to_household(
            household=household,
            member=self.member_two,
            relationship_to_head=HouseholdRelationship.SPOUSE,
            actor=self.actor,
        )

        services.set_household_head(
            household=household,
            membership=second_membership,
            actor=self.actor,
        )

        first_membership.refresh_from_db()
        second_membership.refresh_from_db()
        self.assertFalse(first_membership.is_head)
        self.assertTrue(second_membership.is_head)
