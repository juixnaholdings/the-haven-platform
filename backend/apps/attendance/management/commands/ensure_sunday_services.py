from django.core.management import BaseCommand, CommandError

from apps.attendance import services


class Command(BaseCommand):
    help = (
        "Ensure system-managed Sunday service events exist for the configured "
        "past and future week horizons."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--weeks-back",
            type=int,
            default=8,
            help="Number of weeks before the current week to ensure Sunday services for.",
        )
        parser.add_argument(
            "--weeks-forward",
            type=int,
            default=12,
            help="Number of weeks after the current week to ensure Sunday services for.",
        )

    def handle(self, *args, **options):
        weeks_back = options["weeks_back"]
        weeks_forward = options["weeks_forward"]

        if weeks_back < 0 or weeks_forward < 0:
            raise CommandError("--weeks-back and --weeks-forward must be zero or greater.")

        sunday_services = services.ensure_system_managed_sunday_services(
            weeks_back=weeks_back,
            weeks_forward=weeks_forward,
        )

        self.stdout.write("System-managed Sunday services ensured.")
        self.stdout.write(f"- Weeks back: {weeks_back}")
        self.stdout.write(f"- Weeks forward: {weeks_forward}")
        self.stdout.write(f"- Sunday services in window: {len(sunday_services)}")
        if sunday_services:
            self.stdout.write(
                f"- Window: {sunday_services[0].service_date} to {sunday_services[-1].service_date}"
            )
