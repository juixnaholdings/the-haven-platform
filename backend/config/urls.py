from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
import environ

env = environ.Env()
environ.Env.read_env()

api_prefix = env("API_PREFIX")

urlpatterns = [
    path("admin/", admin.site.urls),
    path(f"{api_prefix}/schema", SpectacularAPIView.as_view(), name="schema"),
    path(f"{api_prefix}/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path(f"{api_prefix}/users/", include("apps.users.urls")),
]