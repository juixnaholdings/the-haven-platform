from django.db import models
from django.db.models import Q

from apps.common.models import AuditModel


class Household(AuditModel):
    name = models.CharField(max_length=255)
    primary_phone = models.CharField(max_length=32, blank=True)
    address_line_1 = models.CharField(max_length=255, blank=True)
    address_line_2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("name", "id")

    def __str__(self):
        return self.name


class HouseholdRelationship(models.TextChoices):
    HEAD = "HEAD", "Head"
    SPOUSE = "SPOUSE", "Spouse"
    CHILD = "CHILD", "Child"
    RELATIVE = "RELATIVE", "Relative"
    OTHER = "OTHER", "Other"


class HouseholdMembership(AuditModel):
    household = models.ForeignKey(
        "households.Household",
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    member = models.ForeignKey(
        "members.Member",
        on_delete=models.PROTECT,
        related_name="household_memberships",
    )
    relationship_to_head = models.CharField(
        max_length=20,
        choices=HouseholdRelationship.choices,
        default=HouseholdRelationship.OTHER,
    )
    is_head = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    joined_on = models.DateField(null=True, blank=True)
    left_on = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ("-is_head", "id")
        constraints = [
            models.UniqueConstraint(
                fields=["member"],
                condition=Q(is_active=True),
                name="unique_active_household_membership_per_member",
            ),
            models.UniqueConstraint(
                fields=["household"],
                condition=Q(is_active=True, is_head=True),
                name="unique_active_household_head_per_household",
            ),
        ]

    def __str__(self):
        return f"{self.member} in {self.household}"
