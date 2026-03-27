from django.urls import path

from apps.common.apis.admin import AuditEventDetailAdminApi, AuditEventListAdminApi

urlpatterns = [
    path("events/", AuditEventListAdminApi.as_view(), name="audit-events"),
    path("events/<int:audit_event_id>/", AuditEventDetailAdminApi.as_view(), name="audit-event-detail"),
]
