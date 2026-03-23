<<<<<<< HEAD
﻿from .base import *  # noqa
=======
# ruff: noqa: F403,F405

from django.core.exceptions import ImproperlyConfigured

from .base import *
>>>>>>> develop
from .base import env

DEBUG = False

ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=[])

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
<<<<<<< HEAD
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=60)
SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool("SECURE_HSTS_INCLUDE_SUBDOMAINS", default=True)
SECURE_HSTS_PRELOAD = env.bool("SECURE_HSTS_PRELOAD", default=True)
SECURE_CONTENT_TYPE_NOSNIFF = True
=======
USE_X_FORWARDED_HOST = env.bool("USE_X_FORWARDED_HOST", default=True)

SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)
SECURE_REDIRECT_EXEMPT = [r"^health/$"]

SESSION_COOKIE_SECURE = env.bool("SESSION_COOKIE_SECURE", default=True)
CSRF_COOKIE_SECURE = env.bool("CSRF_COOKIE_SECURE", default=True)

# Start conservatively on first HTTPS deploy; raise later after verification.
SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=3600)
SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool("SECURE_HSTS_INCLUDE_SUBDOMAINS", default=False)
SECURE_HSTS_PRELOAD = env.bool("SECURE_HSTS_PRELOAD", default=False)

SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = env("SECURE_REFERRER_POLICY", default="same-origin")
SECURE_CROSS_ORIGIN_OPENER_POLICY = env(
    "SECURE_CROSS_ORIGIN_OPENER_POLICY",
    default="same-origin",
)

if SECRET_KEY == "unsafe-dev-key":
    raise ImproperlyConfigured("SECRET_KEY must be set explicitly for production.")

if not ALLOWED_HOSTS:
    raise ImproperlyConfigured("ALLOWED_HOSTS must be configured for production.")
>>>>>>> develop
