from django.db import models
from django.db.models import Q

from apps.common.models import AuditModel


class Group(AuditModel):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("name", "id")

    def __str__(self):
        return self.name


class GroupMembership(AuditModel):
    group = models.ForeignKey(
        "groups.Group",
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    member = models.ForeignKey(
        "members.Member",
        on_delete=models.PROTECT,
        related_name="group_memberships",
    )
    role_name = models.CharField(max_length=100, blank=True)
    started_on = models.DateField(null=True, blank=True)
    ended_on = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ("-is_active", "id")
        constraints = [
            models.UniqueConstraint(
                fields=["group", "member"],
                condition=Q(is_active=True),
                name="unique_active_group_membership_per_member_group",
            ),
        ]

    def __str__(self):
        return f"{self.member} in {self.group}"
