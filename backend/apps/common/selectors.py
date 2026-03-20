from django.db import connections


def get_health_status():
    with connections["default"].cursor() as cursor:
        cursor.execute("SELECT 1")
        cursor.fetchone()

    return {
        "status": "ok",
        "database": "ok",
    }
