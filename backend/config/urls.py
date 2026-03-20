from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("health/", include("apps.common.urls")),
    path("admin/", admin.site.urls),
    path(f"{settings.API_PREFIX}/schema", SpectacularAPIView.as_view(), name="schema"),
    path(
        f"{settings.API_PREFIX}/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path(f"{settings.API_PREFIX}/reports/", include("apps.reporting.urls")),
    path(f"{settings.API_PREFIX}/finance/", include("apps.finance.urls")),
    path(f"{settings.API_PREFIX}/attendance/", include("apps.attendance.urls")),
    path(f"{settings.API_PREFIX}/groups/", include("apps.groups.urls")),
    path(f"{settings.API_PREFIX}/members/", include("apps.members.urls")),
    path(f"{settings.API_PREFIX}/households/", include("apps.households.urls")),
    path(f"{settings.API_PREFIX}/", include("apps.users.urls")),
]
