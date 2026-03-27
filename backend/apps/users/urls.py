from django.urls import path

from apps.users.apis.admin import (
    RoleSummaryListAdminApi,
    StaffUserDetailAdminApi,
    StaffUserListCreateAdminApi,
)
from apps.users.apis.public import (
    PublicLoginJwtApi,
    PublicLogoutJwtApi,
    PublicMeApi,
    PublicTokenRefreshApi,
    PublicTokenVerifyApi,
)

urlpatterns = [
    path(
        "settings/staff-users/",
        StaffUserListCreateAdminApi.as_view(),
        name="settings-staff-users",
    ),
    path(
        "settings/staff-users/<int:staff_user_id>/",
        StaffUserDetailAdminApi.as_view(),
        name="settings-staff-user-detail",
    ),
    path("settings/roles/", RoleSummaryListAdminApi.as_view(), name="settings-roles"),
    path("auth/login/", PublicLoginJwtApi.as_view(), name="auth-login"),
    path("auth/logout/", PublicLogoutJwtApi.as_view(), name="auth-logout"),
    path("auth/me/", PublicMeApi.as_view(), name="auth-me"),
    path("auth/token/refresh/", PublicTokenRefreshApi.as_view(), name="auth-token-refresh"),
    path("auth/token/verify/", PublicTokenVerifyApi.as_view(), name="auth-token-verify"),
]
