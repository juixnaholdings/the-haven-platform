from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.users.constants import CHURCH_ADMIN_ROLE, LEADERSHIP_VIEWER_ROLE, SUPER_ADMIN_ROLE
from apps.users.selectors import user_has_any_role


class GroupsAdminPermission(BasePermission):
    read_roles = (
        SUPER_ADMIN_ROLE,
        CHURCH_ADMIN_ROLE,
        LEADERSHIP_VIEWER_ROLE,
    )
    write_roles = (
        SUPER_ADMIN_ROLE,
        CHURCH_ADMIN_ROLE,
    )

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if request.method in SAFE_METHODS:
            return user_has_any_role(user=user, role_names=self.read_roles) or (
                user.is_staff and user.has_perm("groups.view_group")
            )

        if request.method == "POST":
            return user_has_any_role(user=user, role_names=self.write_roles) or (
                user.is_staff and user.has_perm("groups.add_group")
            )

        if request.method in ("PUT", "PATCH"):
            return user_has_any_role(user=user, role_names=self.write_roles) or (
                user.is_staff and user.has_perm("groups.change_group")
            )

        return False


class GroupMembershipAdminPermission(BasePermission):
    read_roles = (
        SUPER_ADMIN_ROLE,
        CHURCH_ADMIN_ROLE,
        LEADERSHIP_VIEWER_ROLE,
    )
    write_roles = (
        SUPER_ADMIN_ROLE,
        CHURCH_ADMIN_ROLE,
    )

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if request.method in SAFE_METHODS:
            return user_has_any_role(user=user, role_names=self.read_roles) or (
                user.is_staff and user.has_perm("groups.view_groupmembership")
            )

        if request.method == "POST":
            return user_has_any_role(user=user, role_names=self.write_roles) or (
                user.is_staff and user.has_perm("groups.add_groupmembership")
            )

        if request.method in ("PUT", "PATCH"):
            return user_has_any_role(user=user, role_names=self.write_roles) or (
                user.is_staff and user.has_perm("groups.change_groupmembership")
            )

        return False
