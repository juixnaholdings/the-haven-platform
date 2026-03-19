from django.urls import path

from apps.members.apis.admin import MemberDetailAdminApi, MemberListCreateAdminApi

urlpatterns = [
    path("", MemberListCreateAdminApi.as_view(), name="member-list-create"),
    path("<int:member_id>/", MemberDetailAdminApi.as_view(), name="member-detail"),
]
