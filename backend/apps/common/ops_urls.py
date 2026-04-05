from django.urls import path

from apps.common.apis.admin import OpsNotificationFeedApi

urlpatterns = [
    path("notifications/", OpsNotificationFeedApi.as_view(), name="ops-notifications"),
]
