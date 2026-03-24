from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand

ROLE_NAMES = [
    "SUPER_ADMIN",
    "CHURCH_ADMIN",
    "MEMBERSHIP_SECRETARY",
    "ATTENDANCE_OFFICER",
    "FINANCE_SECRETARY",
    "LEADERSHIP_VIEWER",
]


class Command(BaseCommand):
    help = "Create default role groups for The Haven"

    def handle(self, *args, **options):
        for role in ROLE_NAMES:
            Group.objects.get_or_create(name=role)
        self.stdout.write(self.style.SUCCESS("Default roles ensured."))
