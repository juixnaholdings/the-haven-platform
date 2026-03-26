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

export interface UserRoleRef {
  id: number;
  name: string;
}

export interface StaffUserListItem extends User {
  full_name: string;
  roles: UserRoleRef[];
  last_login: string | null;
  date_joined: string;
}

export interface StaffUserCreatePayload {
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  password: string;
  is_active?: boolean;
  role_ids?: number[];
}

export interface StaffUserUpdatePayload {
  email?: string;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
  role_ids?: number[];
}

export interface RolePermissionSummary {
  id: number;
  app_label: string;
  codename: string;
  name: string;
  permission_code: string;
}

export interface RoleSummary {
  id: number;
  name: string;
  user_count: number;
  permissions: RolePermissionSummary[];
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export interface VerifyTokenPayload {
  token: string;
}


export interface RefreshTokenPayload {
  refresh: string;
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

export interface GroupListItem {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  active_member_count: number;
}

export interface GroupMembership {
  id: number;
  member_id: number;
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
  role_name: string;
  started_on: string | null;
  ended_on: string | null;
  is_active: boolean;
  notes: string;
}

export interface GroupDetail {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  memberships: GroupMembership[];
  created_at: string;
  updated_at: string;
}

export interface GroupWritePayload {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface GroupMembershipCreatePayload {
  member_id: number;
  role_name?: string;
  started_on?: string | null;
  notes?: string;
}

export interface GroupMembershipUpdatePayload {
  role_name?: string;
  started_on?: string | null;
  ended_on?: string | null;
  is_active?: boolean;
  notes?: string;
}

export interface GroupListFilters extends PaginationParams {
  search?: string;
  is_active?: boolean;
}

export interface AttendanceSummary {
  id: number;
  men_count: number;
  women_count: number;
  children_count: number;
  visitor_count: number;
  total_count: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceSummaryWritePayload {
  men_count: number;
  women_count: number;
  children_count: number;
  visitor_count: number;
  total_count: number;
  notes?: string;
}

export interface MemberAttendance {
  id: number;
  member_id: number;
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
  status: string;
  checked_in_at: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface MemberAttendanceCreatePayload {
  member_id: number;
  status?: string;
  checked_in_at?: string | null;
  notes?: string;
}

export interface MemberAttendanceUpdatePayload {
  status?: string;
  checked_in_at?: string | null;
  notes?: string;
}

export interface ServiceEventListItem {
  id: number;
  title: string;
  event_type: string;
  service_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string;
  is_active: boolean;
  member_attendance_count: number;
  has_attendance_summary: boolean;
}

export interface ServiceEventDetail {
  id: number;
  title: string;
  event_type: string;
  service_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string;
  notes: string;
  is_active: boolean;
  attendance_summary: AttendanceSummary | null;
  member_attendances: MemberAttendance[];
  created_at: string;
  updated_at: string;
}

export interface ServiceEventWritePayload {
  title: string;
  event_type: string;
  service_date: string;
  start_time?: string | null;
  end_time?: string | null;
  location?: string;
  notes?: string;
  is_active?: boolean;
}

export interface ServiceEventListFilters extends PaginationParams {
  search?: string;
  event_type?: string;
  is_active?: boolean;
  service_date_from?: string;
  service_date_to?: string;
}

export interface MemberAttendanceListFilters {
  search?: string;
  status?: string;
}

export interface ServiceEventReference {
  id: number;
  title: string;
  event_type: string;
  service_date: string;
}

export interface FundAccountListItem {
  id: number;
  name: string;
  code: string;
  description: string;
  is_active: boolean;
  current_balance: string;
}

export interface FundAccountDetail extends FundAccountListItem {
  created_at: string;
  updated_at: string;
}

export interface FundAccountWritePayload {
  name: string;
  code: string;
  description?: string;
  is_active?: boolean;
}

export interface FundAccountListFilters {
  search?: string;
  is_active?: boolean;
}

export interface TransactionLine {
  id: number;
  fund_account_id: number;
  fund_account_name: string;
  fund_account_code: string;
  direction: string;
  amount: string;
  category_name: string;
  notes: string;
}

export interface TransactionListItem {
  id: number;
  reference_no: string;
  transaction_type: string;
  transaction_date: string;
  description: string;
  service_event_id: number | null;
  service_event_title: string | null;
  posted_at: string;
  line_count: number;
  total_in_amount: string;
  total_out_amount: string;
}

export interface TransactionDetail {
  id: number;
  reference_no: string;
  transaction_type: string;
  transaction_date: string;
  description: string;
  service_event: ServiceEventReference | null;
  posted_at: string;
  total_in_amount: string;
  total_out_amount: string;
  lines: TransactionLine[];
  created_at: string;
  updated_at: string;
}

export interface TransactionListFilters extends PaginationParams {
  search?: string;
  transaction_type?: string;
  fund_account_id?: number;
  service_event_id?: number | null;
  transaction_date_from?: string;
  transaction_date_to?: string;
}

export interface IncomeTransactionPayload {
  fund_account_id: number;
  amount: string | number;
  transaction_date: string;
  description: string;
  service_event_id?: number | null;
  category_name?: string;
  notes?: string;
}

export interface ExpenseTransactionPayload {
  fund_account_id: number;
  amount: string | number;
  transaction_date: string;
  description: string;
  service_event_id?: number | null;
  category_name?: string;
  notes?: string;
}

export interface TransferTransactionPayload {
  source_fund_account_id: number;
  destination_fund_account_id: number;
  amount: string | number;
  transaction_date: string;
  description: string;
  service_event_id?: number | null;
  category_name?: string;
  notes?: string;
}

export interface TransactionUpdatePayload {
  transaction_date?: string;
  description?: string;
  service_event_id?: number | null;
}

export interface ReportingDateRange {
  start_date?: string;
  end_date?: string;
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
