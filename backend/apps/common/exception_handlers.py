# apps/common/exception_handler.py

from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.http import Http404
from rest_framework import status
from rest_framework.exceptions import (
    APIException,
    AuthenticationFailed,
    NotAuthenticated,
    PermissionDenied,
    ValidationError,
)
from rest_framework.response import Response
from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        message = "An error occurred."
        errors = {}

        if isinstance(exc, ValidationError):
            message = "Validation failed."
            errors = response.data
        elif isinstance(exc, NotAuthenticated):
            message = "Authentication credentials were not provided."
        elif isinstance(exc, AuthenticationFailed):
            message = "Authentication failed."
        elif isinstance(exc, PermissionDenied) or isinstance(exc, DjangoPermissionDenied):
            message = "You do not have permission to perform this action."
        elif isinstance(exc, Http404):
            message = "The requested resource was not found."
        elif isinstance(exc, APIException):
            detail = getattr(exc, "detail", None)
            if isinstance(detail, dict):
                errors = detail
                message = "Request failed."
            elif isinstance(detail, list):
                errors = {"non_field_errors": detail}
                message = "Request failed."
            elif detail:
                message = str(detail)

        response.data = {
            "code": 0,
            "status": "error",
            "message": message,
            "errors": errors,
            "data": {},
        }
        return response

    return Response(
        {
            "code": 0,
            "status": "error",
            "message": "Internal server error.",
            "errors": {},
            "data": {},
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )