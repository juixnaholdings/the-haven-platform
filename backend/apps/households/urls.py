from django.urls import path

from apps.households.apis.admin import (
    HouseholdDetailAdminApi,
    HouseholdListCreateAdminApi,
    HouseholdMemberCreateAdminApi,
)

urlpatterns = [
    path("", HouseholdListCreateAdminApi.as_view(), name="household-list-create"),
    path("<int:household_id>/", HouseholdDetailAdminApi.as_view(), name="household-detail"),
    path(
        "<int:household_id>/members/",
        HouseholdMemberCreateAdminApi.as_view(),
        name="household-member-create",
    ),
]
