from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models

from apps.common.models import AuditModel


class User(AbstractUser):
    email = models.EmailField(unique=True)

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"


class StaffInviteStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    ACCEPTED = "ACCEPTED", "Accepted"
    REVOKED = "REVOKED", "Revoked"
    EXPIRED = "EXPIRED", "Expired"


class StaffInvite(AuditModel):
    email = models.EmailField(db_index=True)
    token = models.CharField(max_length=96, unique=True, null=True, blank=True, db_index=True)
    status = models.CharField(
        max_length=20,
        choices=StaffInviteStatus.choices,
        default=StaffInviteStatus.PENDING,
        db_index=True,
    )
    expires_at = models.DateTimeField(db_index=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    accepted_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="accepted_staff_invites",
    )
    role_groups = models.ManyToManyField("auth.Group", blank=True, related_name="staff_invites")

    class Meta:
        ordering = ("-created_at", "-id")

    def __str__(self):
        return f"Staff invite for {self.email} ({self.status})"
