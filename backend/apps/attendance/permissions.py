from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.users.constants import (
    ATTENDANCE_OFFICER_ROLE,
    CHURCH_ADMIN_ROLE,
    LEADERSHIP_VIEWER_ROLE,
    SUPER_ADMIN_ROLE,
)
from apps.users.selectors import user_has_any_role


class ServiceEventAdminPermission(BasePermission):
    read_roles = (
        SUPER_ADMIN_ROLE,
        CHURCH_ADMIN_ROLE,
        ATTENDANCE_OFFICER_ROLE,
        LEADERSHIP_VIEWER_ROLE,
    )
    write_roles = (
        SUPER_ADMIN_ROLE,
        CHURCH_ADMIN_ROLE,
        ATTENDANCE_OFFICER_ROLE,
    )

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if request.method in SAFE_METHODS:
            return user_has_any_role(user=user, role_names=self.read_roles) or (
                user.is_staff and user.has_perm("attendance.view_serviceevent")
            )

        if request.method == "POST":
            return user_has_any_role(user=user, role_names=self.write_roles) or (
                user.is_staff and user.has_perm("attendance.add_serviceevent")
            )

        if request.method in ("PUT", "PATCH"):
            return user_has_any_role(user=user, role_names=self.write_roles) or (
                user.is_staff and user.has_perm("attendance.change_serviceevent")
            )

        return False


class AttendanceSummaryAdminPermission(BasePermission):
    read_roles = (
        SUPER_ADMIN_ROLE,
        CHURCH_ADMIN_ROLE,
        ATTENDANCE_OFFICER_ROLE,
        LEADERSHIP_VIEWER_ROLE,
    )
    write_roles = (
        SUPER_ADMIN_ROLE,
        CHURCH_ADMIN_ROLE,
        ATTENDANCE_OFFICER_ROLE,
    )

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if request.method in SAFE_METHODS:
            return user_has_any_role(user=user, role_names=self.read_roles) or (
                user.is_staff and user.has_perm("attendance.view_attendancesummary")
            )

        if request.method in ("PUT", "PATCH"):
            return user_has_any_role(user=user, role_names=self.write_roles) or (
                user.is_staff
                and (
                    user.has_perm("attendance.add_attendancesummary")
                    or user.has_perm("attendance.change_attendancesummary")
                )
            )

        return False


class MemberAttendanceAdminPermission(BasePermission):
    read_roles = (
        SUPER_ADMIN_ROLE,
        CHURCH_ADMIN_ROLE,
        ATTENDANCE_OFFICER_ROLE,
        LEADERSHIP_VIEWER_ROLE,
    )
    write_roles = (
        SUPER_ADMIN_ROLE,
        CHURCH_ADMIN_ROLE,
        ATTENDANCE_OFFICER_ROLE,
    )

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if request.method in SAFE_METHODS:
            return user_has_any_role(user=user, role_names=self.read_roles) or (
                user.is_staff and user.has_perm("attendance.view_memberattendance")
            )

        if request.method == "POST":
            return user_has_any_role(user=user, role_names=self.write_roles) or (
                user.is_staff and user.has_perm("attendance.add_memberattendance")
            )

        if request.method in ("PUT", "PATCH"):
            return user_has_any_role(user=user, role_names=self.write_roles) or (
                user.is_staff and user.has_perm("attendance.change_memberattendance")
            )

        return False
