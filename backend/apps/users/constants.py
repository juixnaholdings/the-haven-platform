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

DASHBOARD_REPORT_READ_ROLES = (
    SUPER_ADMIN_ROLE,
    CHURCH_ADMIN_ROLE,
    LEADERSHIP_VIEWER_ROLE,
)

MEMBERSHIP_REPORT_READ_ROLES = (
    *DASHBOARD_REPORT_READ_ROLES,
    MEMBERSHIP_SECRETARY_ROLE,
)

HOUSEHOLD_REPORT_READ_ROLES = MEMBERSHIP_REPORT_READ_ROLES

GROUP_REPORT_READ_ROLES = DASHBOARD_REPORT_READ_ROLES

ATTENDANCE_REPORT_READ_ROLES = (
    *DASHBOARD_REPORT_READ_ROLES,
    ATTENDANCE_OFFICER_ROLE,
)

FINANCE_REPORT_READ_ROLES = (
    *DASHBOARD_REPORT_READ_ROLES,
    FINANCE_SECRETARY_ROLE,
)

ROLE_PERMISSION_MAP = {
    SUPER_ADMIN_ROLE: ALL_AVAILABLE_PERMISSIONS,
    CHURCH_ADMIN_ROLE: (
        "common.view_auditevent",
        "auth.view_group",
        "auth.add_group",
        "auth.change_group",
        "users.view_user",
        "users.add_user",
        "users.change_user",
        "groups.view_group",
        "groups.add_group",
        "groups.change_group",
        "groups.view_groupmembership",
        "groups.add_groupmembership",
        "groups.change_groupmembership",
        "members.view_member",
        "members.add_member",
        "members.change_member",
        "households.view_household",
        "households.add_household",
        "households.change_household",
        "households.view_householdmembership",
        "households.add_householdmembership",
        "households.change_householdmembership",
        "attendance.view_serviceevent",
        "attendance.add_serviceevent",
        "attendance.change_serviceevent",
        "attendance.view_attendancesummary",
        "attendance.add_attendancesummary",
        "attendance.change_attendancesummary",
        "attendance.view_memberattendance",
        "attendance.add_memberattendance",
        "attendance.change_memberattendance",
        "finance.view_fundaccount",
        "finance.add_fundaccount",
        "finance.change_fundaccount",
        "finance.view_transaction",
        "finance.add_transaction",
        "finance.change_transaction",
        "finance.view_transactionline",
        "finance.add_transactionline",
        "finance.change_transactionline",
    ),
    MEMBERSHIP_SECRETARY_ROLE: (
        "users.view_user",
        "members.view_member",
        "members.add_member",
        "members.change_member",
        "households.view_household",
        "households.add_household",
        "households.change_household",
        "households.view_householdmembership",
        "households.add_householdmembership",
        "households.change_householdmembership",
    ),
    ATTENDANCE_OFFICER_ROLE: (
        "users.view_user",
        "attendance.view_serviceevent",
        "attendance.add_serviceevent",
        "attendance.change_serviceevent",
        "attendance.view_attendancesummary",
        "attendance.add_attendancesummary",
        "attendance.change_attendancesummary",
        "attendance.view_memberattendance",
        "attendance.add_memberattendance",
        "attendance.change_memberattendance",
    ),
    FINANCE_SECRETARY_ROLE: (
        "users.view_user",
        "finance.view_fundaccount",
        "finance.add_fundaccount",
        "finance.change_fundaccount",
        "finance.view_transaction",
        "finance.add_transaction",
        "finance.change_transaction",
        "finance.view_transactionline",
        "finance.add_transactionline",
        "finance.change_transactionline",
    ),
    LEADERSHIP_VIEWER_ROLE: (
        "users.view_user",
        "groups.view_group",
        "groups.view_groupmembership",
        "members.view_member",
        "households.view_household",
        "households.view_householdmembership",
        "attendance.view_serviceevent",
        "attendance.view_attendancesummary",
        "attendance.view_memberattendance",
        "finance.view_fundaccount",
        "finance.view_transaction",
        "finance.view_transactionline",
    ),
}
