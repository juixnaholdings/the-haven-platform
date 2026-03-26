from datetime import timedelta
from pathlib import Path
import os

import environ

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILE = BASE_DIR / ".env"

env = environ.Env()
# Local CLI usage reads backend/.env by default. Containerized staging and production
# should inject environment variables directly through Compose or the process manager.
if ENV_FILE.exists():
    environ.Env.read_env(ENV_FILE)

SECRET_KEY = env("SECRET_KEY", default="unsafe-dev-key")
DEBUG = env.bool("DEBUG", default=False)
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])
API_PREFIX = env("API_PREFIX", default="api")

INSTALLED_APPS = [
    "jazzmin",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "drf_spectacular",
    "rest_framework_simplejwt.token_blacklist",
    "apps.common",
    "apps.users",
    "apps.members",
    "apps.households",
    "apps.groups",
    "apps.attendance",
    "apps.finance",
    "apps.reporting",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

DATABASES = {
    "default": env.db(
        "DATABASE_URL",
        default="sqlite:///" + str(BASE_DIR / "db.sqlite3"),
    )
}
DATABASES["default"]["CONN_MAX_AGE"] = env.int(
    "DATABASE_CONN_MAX_AGE",
    default=0 if DEBUG else 60,
)
DATABASES["default"]["CONN_HEALTH_CHECKS"] = env.bool(
    "DATABASE_CONN_HEALTH_CHECKS",
    default=not DEBUG,
)

JWT_ACCESS_TOKEN_LIFETIME_MINUTES = env.int("JWT_ACCESS_TOKEN_LIFETIME_MINUTES", default=5)
JWT_REFRESH_TOKEN_LIFETIME_DAYS = env.int("JWT_REFRESH_TOKEN_LIFETIME_DAYS", default=7)
JWT_ROTATE_REFRESH_TOKENS = env.bool("JWT_ROTATE_REFRESH_TOKENS", default=True)
JWT_BLACKLIST_AFTER_ROTATION = env.bool("JWT_BLACKLIST_AFTER_ROTATION", default=True)

AUTH_REFRESH_COOKIE_NAME = env(
    "AUTH_REFRESH_COOKIE_NAME",
    default="refresh" if DEBUG else "__Host-refresh",
)

AUTH_REFRESH_COOKIE_SECURE = env.bool(
    "AUTH_REFRESH_COOKIE_SECURE",
    default=not DEBUG,
)

AUTH_REFRESH_COOKIE_HTTPONLY = True

AUTH_REFRESH_COOKIE_SAMESITE = env(
    "AUTH_REFRESH_COOKIE_SAMESITE",
    default="Lax",
)

AUTH_REFRESH_COOKIE_PATH = env(
    "AUTH_REFRESH_COOKIE_PATH",
    default="/",
)

AUTH_REFRESH_COOKIE_DOMAIN = env(
    "AUTH_REFRESH_COOKIE_DOMAIN",
    default=None,
)

SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)
SESSION_COOKIE_SECURE = env.bool("SESSION_COOKIE_SECURE", default=True)
CSRF_COOKIE_SECURE = env.bool("CSRF_COOKIE_SECURE", default=True)

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_THROTTLE_CLASSES": ("rest_framework.throttling.ScopedRateThrottle",),
    "DEFAULT_THROTTLE_RATES": {
        "auth_login": "5/min",
        "auth_refresh": "20/min",
        "auth_logout": "20/min",
    },
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "apps.common.exception_handlers.custom_exception_handler",
}

AUTH_USER_MODEL = "users.User"

SPECTACULAR_SETTINGS = {
    "TITLE": "The Haven API",
    "DESCRIPTION": "Operational API for The Haven Phase 1 church management backend.",
    "VERSION": "1.0.0",
    "SCHEMA_PATH_PREFIX": rf"/{API_PREFIX}",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "SWAGGER_UI_SETTINGS": {
        "persistAuthorization": True,
        "displayRequestDuration": True,
        "docExpansion": "list",
    },
    "TAGS": [
        {"name": "Public - Auth", "description": "JWT authentication endpoints for API clients."},
        {"name": "Public - Ops", "description": "Unauthenticated operational endpoints."},
        {"name": "Admin - Members", "description": "Administrative member management APIs."},
        {"name": "Admin - Households", "description": "Administrative household management APIs."},
        {"name": "Admin - Groups", "description": "Administrative business-group management APIs."},
        {"name": "Admin - Attendance", "description": "Administrative attendance management APIs."},
        {"name": "Admin - Finance", "description": "Administrative finance ledger APIs."},
        {"name": "Admin - Reporting", "description": "Administrative reporting and dashboard APIs."},
        {"name": "Admin - Settings", "description": "Administrative read-only role and staff APIs."},
    ],
}

CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])
CORS_ALLOW_ALL_ORIGINS = env.bool("CORS_ALLOW_ALL_ORIGINS", default=False)
CORS_ALLOW_CREDENTIALS = env.bool("CORS_ALLOW_CREDENTIALS", default=False)
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])

LANGUAGE_CODE = "en-us"
TIME_ZONE = env("TIME_ZONE", default="UTC")
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=JWT_ACCESS_TOKEN_LIFETIME_MINUTES),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=JWT_REFRESH_TOKEN_LIFETIME_DAYS),
    "ROTATE_REFRESH_TOKENS": JWT_ROTATE_REFRESH_TOKENS,
    "BLACKLIST_AFTER_ROTATION": JWT_BLACKLIST_AFTER_ROTATION,
    "UPDATE_LAST_LOGIN": False,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",
}


JAZZMIN_SETTINGS = {
    "site_title": "The Haven Admin",
    "site_header": "The Haven",
    "site_brand": "The Haven",
    "welcome_sign": "Welcome to The Haven Admin",
    "copyright": "The Haven",
    "search_model": [
        "users.User",
        "auth.Group",
        "members.Member",
        "households.Household",
        "groups.Group",
        "attendance.ServiceEvent",
        "finance.FundAccount",
        "finance.Transaction",
    ],
    "show_sidebar": True,
    "navigation_expanded": True,
    "show_ui_builder": False,
    "changeform_format": "horizontal_tabs",
    "related_modal_active": True,
    "icons": {
        "auth": "fas fa-users-cog",
        "auth.group": "fas fa-users",
        "users": "fas fa-user-shield",
        "users.user": "fas fa-user",
        "members": "fas fa-id-card",
        "members.member": "fas fa-address-card",
        "households": "fas fa-house-user",
        "households.household": "fas fa-house-user",
        "households.householdmembership": "fas fa-people-roof",
        "groups": "fas fa-layer-group",
        "groups.group": "fas fa-layer-group",
        "groups.groupmembership": "fas fa-user-tag",
        "attendance": "fas fa-calendar-check",
        "attendance.serviceevent": "fas fa-calendar-day",
        "attendance.attendancesummary": "fas fa-clipboard-list",
        "attendance.memberattendance": "fas fa-user-check",
        "finance": "fas fa-wallet",
        "finance.fundaccount": "fas fa-piggy-bank",
        "finance.transaction": "fas fa-receipt",
        "finance.transactionline": "fas fa-list-ol",
    },
    "order_with_respect_to": [
        "users",
        "members",
        "households",
        "groups",
        "attendance",
        "finance",
        "auth",
    ],
}

JAZZMIN_UI_TWEAKS = {
    "theme": "flatly",
    "dark_mode_theme": "darkly",
    "navbar": "navbar-white navbar-light",
    "sidebar": "sidebar-dark-primary",
    "brand_colour": "navbar-primary",
    "accent": "accent-primary",
}
