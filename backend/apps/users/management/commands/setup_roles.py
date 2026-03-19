from django.core.management.base import BaseCommand, CommandError
from django.db.utils import OperationalError, ProgrammingError

from apps.users.constants import ROLE_PERMISSION_MAP
from apps.users.services import setup_role_group


class Command(BaseCommand):
    help = "Ensure the baseline RBAC groups and currently available permissions exist."

    def handle(self, *args, **options):
        try:
            created_groups = 0
            added_permissions = 0
            missing_permissions = 0

            for role_name, permission_labels in ROLE_PERMISSION_MAP.items():
                result = setup_role_group(role_name=role_name, permission_labels=permission_labels)
                created_groups += int(result.created)
                added_permissions += len(result.added_permissions)
                missing_permissions += len(result.missing_permissions)

                status = "created" if result.created else "existing"
                self.stdout.write(
                    f"{role_name}: {status}, added {len(result.added_permissions)} permission(s), "
                    f"skipped {len(result.missing_permissions)} missing permission(s)."
                )
                if result.missing_permissions:
                    self.stdout.write(f"  Missing: {', '.join(result.missing_permissions)}")

            self.stdout.write(
                self.style.SUCCESS(
                    "Summary: "
                    f"ensured {len(ROLE_PERMISSION_MAP)} group(s), "
                    f"created {created_groups}, "
                    f"added {added_permissions} permission assignment(s), "
                    f"skipped {missing_permissions} missing permission(s)."
                )
            )
        except (OperationalError, ProgrammingError) as exc:
            raise CommandError(
                "Database tables are not ready. Run `python backend/manage.py migrate` first."
            ) from exc
