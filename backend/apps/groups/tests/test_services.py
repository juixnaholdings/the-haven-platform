from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.exceptions import ValidationError

from apps.groups import services
from apps.groups.models import GroupMembership
from apps.members.models import Member

User = get_user_model()


class GroupServiceTests(TestCase):
    def setUp(self):
        self.actor = User.objects.create_superuser(
            username="group-service-admin",
            email="group-service-admin@example.com",
            password="StrongPass123",
        )
        self.group = services.create_group(
            data={"name": "Choir", "description": "Music ministry", "is_active": True},
            actor=self.actor,
        )
        self.member = Member.objects.create(first_name="Ama", last_name="Mensah")

    def test_group_creation(self):
        self.assertEqual(self.group.name, "Choir")
        self.assertEqual(self.group.created_by, self.actor)

    def test_group_membership_creation(self):
        membership = services.add_member_to_group(
            group=self.group,
            member=self.member,
            role_name="Lead Singer",
            actor=self.actor,
        )

        self.assertEqual(membership.group, self.group)
        self.assertEqual(membership.role_name, "Lead Singer")
        self.assertTrue(membership.is_active)

    def test_cannot_create_duplicate_active_member_group_affiliation(self):
        services.add_member_to_group(group=self.group, member=self.member, actor=self.actor)

        with self.assertRaises(ValidationError):
            services.add_member_to_group(group=self.group, member=self.member, actor=self.actor)

    def test_can_preserve_ended_affiliation_history(self):
        first_membership = services.add_member_to_group(
            group=self.group,
            member=self.member,
            role_name="Member",
            actor=self.actor,
        )
        services.deactivate_group_membership(
            membership=first_membership,
            ended_on=date(2026, 3, 1),
            actor=self.actor,
        )

        second_membership = services.add_member_to_group(
            group=self.group,
            member=self.member,
            role_name="Team Lead",
            actor=self.actor,
        )

        self.assertEqual(GroupMembership.objects.filter(group=self.group, member=self.member).count(), 2)
        first_membership.refresh_from_db()
        self.assertFalse(first_membership.is_active)
        self.assertTrue(second_membership.is_active)

    def test_invalid_date_combinations_are_rejected(self):
        with self.assertRaises(ValidationError):
            services.update_group_membership(
                membership=services.add_member_to_group(
                    group=self.group,
                    member=self.member,
                    actor=self.actor,
                ),
                data={
                    "is_active": False,
                    "started_on": date(2026, 3, 10),
                    "ended_on": date(2026, 3, 1),
                },
                actor=self.actor,
            )

    def test_active_affiliation_cannot_set_end_date(self):
        membership = services.add_member_to_group(
            group=self.group,
            member=self.member,
            actor=self.actor,
        )

        with self.assertRaises(ValidationError):
            services.update_group_membership(
                membership=membership,
                data={"ended_on": date(2026, 3, 10)},
                actor=self.actor,
            )

    def test_reactivate_group_membership(self):
        membership = services.add_member_to_group(
            group=self.group,
            member=self.member,
            actor=self.actor,
        )
        services.deactivate_group_membership(
            membership=membership,
            ended_on=date(2026, 3, 1),
            actor=self.actor,
        )

        services.reactivate_group_membership(
            membership=membership,
            started_on=date(2026, 3, 15),
            actor=self.actor,
        )

        membership.refresh_from_db()
        self.assertTrue(membership.is_active)
        self.assertIsNone(membership.ended_on)
