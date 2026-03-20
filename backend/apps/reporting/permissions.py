from rest_framework.permissions import BasePermission

from apps.users.constants import (
    DASHBOARD_REPORT_READ_ROLES,
)
from apps.users.selectors import user_has_all_permissions, user_has_any_role


class ReportingAdminPermission(BasePermission):
    default_read_roles = DASHBOARD_REPORT_READ_ROLES

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        read_roles = getattr(view, "read_roles", self.default_read_roles)
        if user_has_any_role(user=user, role_names=read_roles):
            return True

        required_permissions = getattr(view, "required_permissions", ())
        return bool(required_permissions) and user.is_staff and user_has_all_permissions(
            user=user,
            permissions=required_permissions,
        )
