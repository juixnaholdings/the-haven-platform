ALL_AVAILABLE_PERMISSIONS = "__all__"

SUPER_ADMIN_ROLE = "Super Admin"
CHURCH_ADMIN_ROLE = "Church Admin"
MEMBERSHIP_SECRETARY_ROLE = "Membership Secretary"
ATTENDANCE_OFFICER_ROLE = "Attendance Officer"
FINANCE_SECRETARY_ROLE = "Finance Secretary"
LEADERSHIP_VIEWER_ROLE = "Leadership Viewer"

BASELINE_ROLE_NAMES = (
    SUPER_ADMIN_ROLE,
    CHURCH_ADMIN_ROLE,
    MEMBERSHIP_SECRETARY_ROLE,
    ATTENDANCE_OFFICER_ROLE,
    FINANCE_SECRETARY_ROLE,
    LEADERSHIP_VIEWER_ROLE,
)

ROLE_PERMISSION_MAP = {
    SUPER_ADMIN_ROLE: ALL_AVAILABLE_PERMISSIONS,
    CHURCH_ADMIN_ROLE: (
        "auth.view_group",
        "auth.add_group",
        "auth.change_group",
        "users.view_user",
        "users.add_user",
        "users.change_user",
        "members.view_member",
        "members.add_member",
        "members.change_member",
        "attendance.view_serviceevent",
        "attendance.add_serviceevent",
        "attendance.change_serviceevent",
        "finance.view_transaction",
        "finance.add_transaction",
        "finance.change_transaction",
    ),
    MEMBERSHIP_SECRETARY_ROLE: (
        "users.view_user",
        "members.view_member",
        "members.add_member",
        "members.change_member",
    ),
    ATTENDANCE_OFFICER_ROLE: (
        "users.view_user",
        "attendance.view_serviceevent",
        "attendance.add_serviceevent",
        "attendance.change_serviceevent",
    ),
    FINANCE_SECRETARY_ROLE: (
        "users.view_user",
        "finance.view_transaction",
        "finance.add_transaction",
        "finance.change_transaction",
    ),
    LEADERSHIP_VIEWER_ROLE: (
        "users.view_user",
        "members.view_member",
        "attendance.view_serviceevent",
        "finance.view_transaction",
    ),
}
