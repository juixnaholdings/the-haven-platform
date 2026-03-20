from rest_framework.permissions import BasePermission

from apps.users.constants import CHURCH_ADMIN_ROLE
from apps.users.selectors import user_has_any_role


class HasAnyRole(BasePermission):
    required_roles: tuple[str, ...] = ()

    def has_permission(self, request, view):
        return user_has_any_role(user=request.user, role_names=self.required_roles)


class IsChurchAdmin(HasAnyRole):
    required_roles = (CHURCH_ADMIN_ROLE,)
