from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.users.constants import (
    CHURCH_ADMIN_ROLE,
    FINANCE_SECRETARY_ROLE,
    LEADERSHIP_VIEWER_ROLE,
    SUPER_ADMIN_ROLE,
)
from apps.users.selectors import user_has_any_role


class FundAccountAdminPermission(BasePermission):
    read_roles = (
        SUPER_ADMIN_ROLE,
        CHURCH_ADMIN_ROLE,
        FINANCE_SECRETARY_ROLE,
        LEADERSHIP_VIEWER_ROLE,
    )
    write_roles = (
        SUPER_ADMIN_ROLE,
        CHURCH_ADMIN_ROLE,
        FINANCE_SECRETARY_ROLE,
    )

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if request.method in SAFE_METHODS:
            return user_has_any_role(user=user, role_names=self.read_roles) or (
                user.is_staff and user.has_perm("finance.view_fundaccount")
            )

        if request.method == "POST":
            return user_has_any_role(user=user, role_names=self.write_roles) or (
                user.is_staff and user.has_perm("finance.add_fundaccount")
            )

        if request.method in ("PUT", "PATCH"):
            return user_has_any_role(user=user, role_names=self.write_roles) or (
                user.is_staff and user.has_perm("finance.change_fundaccount")
            )

        return False


class TransactionAdminPermission(BasePermission):
    read_roles = (
        SUPER_ADMIN_ROLE,
        CHURCH_ADMIN_ROLE,
        FINANCE_SECRETARY_ROLE,
        LEADERSHIP_VIEWER_ROLE,
    )
    write_roles = (
        SUPER_ADMIN_ROLE,
        CHURCH_ADMIN_ROLE,
        FINANCE_SECRETARY_ROLE,
    )

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if request.method in SAFE_METHODS:
            return user_has_any_role(user=user, role_names=self.read_roles) or (
                user.is_staff and user.has_perm("finance.view_transaction")
            )

        if request.method == "POST":
            return user_has_any_role(user=user, role_names=self.write_roles) or (
                user.is_staff and user.has_perm("finance.add_transaction")
            )

        if request.method in ("PUT", "PATCH"):
            return user_has_any_role(user=user, role_names=self.write_roles) or (
                user.is_staff and user.has_perm("finance.change_transaction")
            )

        return False
