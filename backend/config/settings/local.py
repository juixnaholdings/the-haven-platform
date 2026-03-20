# ruff: noqa: F403,F405

from .base import *  # noqa

DEBUG = True
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["127.0.0.1", "localhost"])
