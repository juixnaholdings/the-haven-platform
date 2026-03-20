from django.core.management.base import BaseCommand

from apps.finance.models import FundAccount


BASELINE_FUND_ACCOUNTS = (
    {
        "name": "General Fund",
        "code": "GF",
        "description": "General church operations and unrestricted giving.",
        "is_active": True,
    },
    {
        "name": "Welfare Fund",
        "code": "WF",
        "description": "Member care, benevolence, and welfare support.",
        "is_active": True,
    },
    {
        "name": "Building Fund",
        "code": "BF",
        "description": "Facility improvements, maintenance, and capital projects.",
        "is_active": True,
    },
    {
        "name": "Project Fund",
        "code": "PF",
        "description": "Special church projects and designated initiatives.",
        "is_active": True,
    },
)


class Command(BaseCommand):
    help = "Seed baseline fund accounts for finance bootstrap."

    def handle(self, *args, **options):
        created_count = 0
        updated_count = 0

        for fund_account_data in BASELINE_FUND_ACCOUNTS:
            fund_account, created = FundAccount.objects.get_or_create(
                code=fund_account_data["code"],
                defaults=fund_account_data,
            )

            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Created fund account {fund_account.name} ({fund_account.code})."
                    )
                )
                continue

            changed_fields = []
            for field in ("name", "description", "is_active"):
                desired_value = fund_account_data[field]
                if getattr(fund_account, field) != desired_value:
                    setattr(fund_account, field, desired_value)
                    changed_fields.append(field)

            if changed_fields:
                fund_account.save()
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(
                        f"Updated fund account {fund_account.name} ({fund_account.code})."
                    )
                )
            else:
                self.stdout.write(
                    f"Fund account {fund_account.name} ({fund_account.code}) already up to date."
                )

        self.stdout.write("")
        self.stdout.write("Summary:")
        self.stdout.write(f"- Created: {created_count}")
        self.stdout.write(f"- Updated: {updated_count}")
        self.stdout.write(
            f"- Total baseline fund accounts: {len(BASELINE_FUND_ACCOUNTS)}"
        )
