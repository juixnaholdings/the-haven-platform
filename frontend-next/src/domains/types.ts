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

export interface PaginationParams {
  page?: number;
  page_size?: number;
}

export interface PaginatedListResponse<TItem> {
  count: number;
  next: string | null;
  previous: string | null;
  page: number;
  page_size: number;
  results: TItem[];
}

export type ListResponse<TItem> = TItem[] | PaginatedListResponse<TItem>;

export interface ListPaginationMeta {
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ListResult<TItem> {
  items: TItem[];
  pagination: ListPaginationMeta | null;
}

export interface MemberListItem {
  id: number;
  first_name: string;
  middle_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone_number: string;
  is_active: boolean;
}

export interface MemberHouseholdMembership {
  id: number;
  household_id: number;
  household_name: string;
  relationship_to_head: string;
  is_head: boolean;
  is_active: boolean;
  joined_on: string | null;
  left_on: string | null;
  notes: string;
}

export interface MemberGroupMembership {
  id: number;
  group_id: number;
  group_name: string;
  role_name: string;
  started_on: string | null;
  ended_on: string | null;
  is_active: boolean;
  notes: string;
}

export interface MemberAttendanceSummary {
  total_records: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
  last_attended_on: string | null;
}

export interface MemberDetail extends MemberListItem {
  date_of_birth: string | null;
  notes: string;
  active_household_membership: MemberHouseholdMembership | null;
  household_memberships: MemberHouseholdMembership[];
  group_memberships: MemberGroupMembership[];
  attendance_summary: MemberAttendanceSummary;
  created_at: string;
  updated_at: string;
}

export interface MemberWritePayload {
  first_name: string;
  middle_name?: string;
  last_name: string;
  email?: string;
  phone_number?: string;
  date_of_birth?: string | null;
  notes?: string;
  is_active?: boolean;
}

export interface MemberListFilters extends PaginationParams {
  search?: string;
  is_active?: boolean;
  household_id?: number;
}

export interface HouseholdListItem {
  id: number;
  name: string;
  primary_phone: string;
  city: string;
  is_active: boolean;
  active_member_count: number;
}

export interface HouseholdMember {
  id: number;
  member_id: number;
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  relationship_to_head: string;
  is_head: boolean;
  is_active: boolean;
  joined_on: string | null;
  left_on: string | null;
  notes: string;
}

export interface HouseholdDetail {
  id: number;
  name: string;
  primary_phone: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  notes: string;
  is_active: boolean;
  members: HouseholdMember[];
  created_at: string;
  updated_at: string;
}

export interface HouseholdWritePayload {
  name: string;
  primary_phone?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  notes?: string;
  is_active?: boolean;
}

export interface HouseholdListFilters extends PaginationParams {
  search?: string;
  is_active?: boolean;
}

export interface HouseholdMembershipCreatePayload {
  member_id: number;
  relationship_to_head?: string;
  is_head?: boolean;
  joined_on?: string | null;
  left_on?: string | null;
  notes?: string;
}

export interface HouseholdMembershipUpdatePayload {
  relationship_to_head?: string;
  is_head?: boolean;
  is_active?: boolean;
  joined_on?: string | null;
  left_on?: string | null;
  notes?: string;
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
