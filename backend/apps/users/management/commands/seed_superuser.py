import os

from django.core.management.base import BaseCommand, CommandError

from apps.users.services import seed_superuser

REQUIRED_ENV_VARS = (
    "DJANGO_SUPERUSER_USERNAME",
    "DJANGO_SUPERUSER_EMAIL",
    "DJANGO_SUPERUSER_PASSWORD",
)


class Command(BaseCommand):
    help = "Create the configured Django superuser if it does not already exist."

    def handle(self, *args, **options):
        env_values = {name: os.environ.get(name, "").strip() for name in REQUIRED_ENV_VARS}
        missing_env_vars = [name for name, value in env_values.items() if not value]
        if missing_env_vars:
            missing = ", ".join(missing_env_vars)
            raise CommandError(f"Missing required environment variables: {missing}")

        try:
            result = seed_superuser(
                username=env_values["DJANGO_SUPERUSER_USERNAME"],
                email=env_values["DJANGO_SUPERUSER_EMAIL"],
                password=env_values["DJANGO_SUPERUSER_PASSWORD"],
            )
        except ValueError as exc:
            raise CommandError(str(exc)) from exc

        if result.created:
            self.stdout.write(self.style.SUCCESS(f"Superuser '{result.username}' created."))
            return

        self.stdout.write(self.style.SUCCESS(f"Superuser '{result.username}' already exists."))
