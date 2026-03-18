from django.contrib import admin
from django.urls import include, path
# from apps.common.api.views import HealthCheckApi

urlpatterns = [
    path("admin/", admin.site.urls),
    # path("health/", HealthCheckApi.as_view(), name="health"),
    path("api/v1/users/", include("apps.users.urls")),
    path("api/v1/members/", include("apps.members.urls")),
    path("api/v1/households/", include("apps.households.urls")),
    path("api/v1/groups/", include("apps.groups.urls")),
    path("api/v1/attendance/", include("apps.attendance.urls")),
    path("api/v1/finance/", include("apps.finance.urls")),
    path("api/v1/reports/", include("apps.reporting.urls")),
]
