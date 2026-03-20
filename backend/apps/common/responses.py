from rest_framework.response import Response


def success_response(data=None, message="Operation successful", status_code=200):
    return Response(
        {
            "code": 1,
            "status": "success",
            "message": message,
            "data": data,
        },
        status=status_code,
    )
