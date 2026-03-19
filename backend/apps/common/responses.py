# apps/common/responses.py

from rest_framework import status
from rest_framework.response import Response


class CustomResponse(Response):
    """
    Standardized success response.
    """

    def __init__(
        self,
        code=1,
        data=None,
        message="Success",
        status_code=status.HTTP_200_OK,
        **kwargs,
    ):
        kwargs.pop("status_text", None)

        payload = {
            "code": code,
            "status": "success",
            "message": message,
            "data": data if data is not None else {},
        }

        super().__init__(data=payload, status=status_code, **kwargs)


class CustomErrorResponse(Response):
    """
    Standardized error response.
    """

    def __init__(
        self,
        code=0,
        message="An error occurred.",
        errors=None,
        status_code=status.HTTP_400_BAD_REQUEST,
        data=None,
        **kwargs,
    ):
        kwargs.pop("status_text", None)

        payload = {
            "code": code,
            "status": "error",
            "message": message,
            "errors": errors if errors is not None else {},
            "data": data if data is not None else {},
        }

        super().__init__(data=payload, status=status_code, **kwargs)
        