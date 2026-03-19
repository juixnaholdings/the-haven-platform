from rest_framework.permissions import BasePermission

from apps.users.constants import (
    ATTENDANCE_OFFICER_ROLE,
    CHURCH_ADMIN_ROLE,
    FINANCE_SECRETARY_ROLE,
    LEADERSHIP_VIEWER_ROLE,
    MEMBERSHIP_SECRETARY_ROLE,
    SUPER_ADMIN_ROLE,
)
from apps.users.selectors import user_has_any_role


class ReportingAdminPermission(BasePermission):
    read_roles = (
        SUPER_ADMIN_ROLE,
        CHURCH_ADMIN_ROLE,
        MEMBERSHIP_SECRETARY_ROLE,
        ATTENDANCE_OFFICER_ROLE,
        FINANCE_SECRETARY_ROLE,
        LEADERSHIP_VIEWER_ROLE,
    )
    fallback_permissions = (
        "users.view_user",
        "members.view_member",
        "households.view_household",
        "groups.view_group",
        "attendance.view_serviceevent",
        "finance.view_transaction",
    )

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if user_has_any_role(user=user, role_names=self.read_roles):
            return True

        return user.is_staff and any(user.has_perm(permission) for permission in self.fallback_permissions)
