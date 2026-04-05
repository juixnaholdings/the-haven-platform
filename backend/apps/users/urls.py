from django.urls import path

from apps.users.apis.admin import (
    BasicUserElevationAdminApi,
    BasicUserListAdminApi,
    RoleSummaryListAdminApi,
    StaffInviteListCreateAdminApi,
    StaffInviteResendAdminApi,
    StaffInviteRevokeAdminApi,
    StaffUserDetailAdminApi,
    StaffUserListCreateAdminApi,
)
from apps.users.apis.public import (
    PublicEmailAvailabilityApi,
    PublicLoginJwtApi,
    PublicLogoutJwtApi,
    PublicMeApi,
    PublicStaffInviteAcceptApi,
    PublicStaffInviteValidateApi,
    PublicSignupApi,
    PublicTokenRefreshApi,
    PublicTokenVerifyApi,
    PublicUsernameAvailabilityApi,
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
    path(
        "settings/basic-users/",
        BasicUserListAdminApi.as_view(),
        name="settings-basic-users",
    ),
    path(
        "settings/basic-users/<int:user_id>/elevate/",
        BasicUserElevationAdminApi.as_view(),
        name="settings-basic-user-elevate",
    ),
    path(
        "settings/staff-invites/",
        StaffInviteListCreateAdminApi.as_view(),
        name="settings-staff-invites",
    ),
    path(
        "settings/staff-invites/<int:staff_invite_id>/revoke/",
        StaffInviteRevokeAdminApi.as_view(),
        name="settings-staff-invite-revoke",
    ),
    path(
        "settings/staff-invites/<int:staff_invite_id>/resend/",
        StaffInviteResendAdminApi.as_view(),
        name="settings-staff-invite-resend",
    ),
    path("auth/login/", PublicLoginJwtApi.as_view(), name="auth-login"),
    path("auth/signup/", PublicSignupApi.as_view(), name="auth-signup"),
    path(
        "auth/staff-invites/<int:staff_invite_id>/validate/",
        PublicStaffInviteValidateApi.as_view(),
        name="auth-staff-invite-validate",
    ),
    path(
        "auth/staff-invites/<int:staff_invite_id>/accept/",
        PublicStaffInviteAcceptApi.as_view(),
        name="auth-staff-invite-accept",
    ),
    path(
        "auth/availability/username/",
        PublicUsernameAvailabilityApi.as_view(),
        name="auth-availability-username",
    ),
    path(
        "auth/availability/email/",
        PublicEmailAvailabilityApi.as_view(),
        name="auth-availability-email",
    ),
    path("auth/logout/", PublicLogoutJwtApi.as_view(), name="auth-logout"),
    path("auth/me/", PublicMeApi.as_view(), name="auth-me"),
    path("auth/token/refresh/", PublicTokenRefreshApi.as_view(), name="auth-token-refresh"),
    path("auth/token/verify/", PublicTokenVerifyApi.as_view(), name="auth-token-verify"),
]
