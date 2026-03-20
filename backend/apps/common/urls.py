from django.urls import path

from apps.common.apis.public import HealthCheckPublicApi

urlpatterns = [
    path("", HealthCheckPublicApi.as_view(), name="health-check"),
]
