export interface AuthTokens {
  access: string;
}

export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  role_names: string[];
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export interface MembershipSummary {
  total_members: number;
  active_members: number;
  inactive_members: number;
}

export interface HouseholdSummary {
  total_households: number;
  households_with_active_head: number;
  average_household_size: number;
}

export interface GroupMembershipCount {
  id: number;
  name: string;
  active_membership_count: number;
}

export interface GroupSummary {
  total_groups: number;
  active_groups: number;
  total_active_affiliations: number;
  group_membership_counts: GroupMembershipCount[];
}

export interface AttendanceEventTypeCount {
  event_type: string;
  count: number;
}

export interface AttendanceReportSummary {
  total_events: number;
  aggregate_men_count: number;
  aggregate_women_count: number;
  aggregate_children_count: number;
  aggregate_visitor_count: number;
  aggregate_total_attendance: number;
  total_member_attendance_records: number;
  event_type_counts: AttendanceEventTypeCount[];
}

export interface FundBalance {
  id: number;
  name: string;
  code: string;
  current_balance: string;
}

export interface FinanceSummary {
  total_fund_accounts: number;
  balances_by_fund: FundBalance[];
  total_income: string;
  total_expense: string;
  total_transfers: string;
  net_flow: string;
}

export interface DashboardOverview {
  members: MembershipSummary;
  households: HouseholdSummary;
  groups: GroupSummary;
  attendance: AttendanceReportSummary;
  finance: FinanceSummary;
}
