# ruff: noqa: F403,F405

from .base import *  # noqa

DEBUG = False
API_PREFIX = "api"
ALLOWED_HOSTS = ["testserver", "localhost", "127.0.0.1"]
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
AUTH_REFRESH_COOKIE_SECURE = False
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "test.sqlite3",
    }
}
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
SIMPLE_JWT = {
    **SIMPLE_JWT,
    "SIGNING_KEY": "test-jwt-signing-key-0123456789abcd",
}
