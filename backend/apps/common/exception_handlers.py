from rest_framework.views import exception_handler
from rest_framework.response import Response


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return Response(
            {
                "code": 0,
                "status": "error",
                "error": {"message": "Internal server error", "details": None},
            },
            status=500,
        )

    return Response(
        {
            "code": 0,
            "status": "error",
            "error": {
                "message": "Request failed",
                "details": response.data,
            },
        },
        status=response.status_code,
    )
