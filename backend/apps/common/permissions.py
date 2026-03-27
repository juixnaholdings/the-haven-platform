from rest_framework.permissions import BasePermission

from apps.users.constants import CHURCH_ADMIN_ROLE, SUPER_ADMIN_ROLE
from apps.users.selectors import user_has_any_role


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class AuditTrailAdminPermission(BasePermission):
    required_roles = (SUPER_ADMIN_ROLE, CHURCH_ADMIN_ROLE)

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        return user_has_any_role(user=user, role_names=self.required_roles) or (
            user.is_staff and user.has_perm("common.view_auditevent")
        )
