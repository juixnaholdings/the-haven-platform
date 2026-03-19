from django.urls import path

from apps.groups.apis.admin import (
    GroupDetailAdminApi,
    GroupListCreateAdminApi,
    GroupMembershipCreateAdminApi,
    GroupMembershipDetailAdminApi,
)

urlpatterns = [
    path("", GroupListCreateAdminApi.as_view(), name="group-list-create"),
    path("<int:group_id>/", GroupDetailAdminApi.as_view(), name="group-detail"),
    path(
        "<int:group_id>/members/",
        GroupMembershipCreateAdminApi.as_view(),
        name="group-membership-create",
    ),
    path(
        "<int:group_id>/memberships/<int:membership_id>/",
        GroupMembershipDetailAdminApi.as_view(),
        name="group-membership-detail",
    ),
]
