from django.db import models

from apps.common.models import AuditModel


class PlaceholderModel(AuditModel):
    name = models.CharField(max_length=255)

    class Meta:
        abstract = True
