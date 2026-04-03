import { expect, test, type Page, type Route } from "@playwright/test";

type SessionMode = "unauthenticated" | "authenticated-admin" | "authenticated-staff";

const adminUser = {
  id: 1,
  username: "church-admin",
  first_name: "Church",
  last_name: "Admin",
  email: "admin@example.com",
  is_active: true,
  is_staff: true,
  is_superuser: false,
  role_names: ["Church Admin"],
};

const staffUser = {
  id: 2,
  username: "attendance-officer",
  first_name: "Attendance",
  last_name: "Officer",
  email: "attendance@example.com",
  is_active: true,
  is_staff: true,
  is_superuser: false,
  role_names: ["Attendance Officer"],
};

const baseMember = {
  id: 1,
  first_name: "Ada",
  middle_name: "",
  last_name: "Lovelace",
  full_name: "Ada Lovelace",
  email: "ada@example.com",
  phone_number: "1234567890",
  is_active: true,
};

const baseMemberDetail = {
  ...baseMember,
  date_of_birth: "1990-01-01",
  notes: "Core member profile",
  active_household_membership: {
    id: 1,
    household_id: 1,
    household_name: "Lovelace Household",
    relationship_to_head: "Head",
    is_head: true,
    is_active: true,
    joined_on: "2024-01-01",
    left_on: null,
    notes: "",
  },
  household_memberships: [
    {
      id: 1,
      household_id: 1,
      household_name: "Lovelace Household",
      relationship_to_head: "Head",
      is_head: true,
      is_active: true,
      joined_on: "2024-01-01",
      left_on: null,
      notes: "",
    },
  ],
  group_memberships: [
    {
      id: 1,
      group_id: 1,
      group_name: "Choir Ministry",
      role_name: "Member",
      started_on: "2024-02-01",
      ended_on: null,
      is_active: true,
      notes: "",
    },
  ],
  attendance_summary: {
    total_records: 5,
    present_count: 4,
    absent_count: 1,
    late_count: 0,
    excused_count: 0,
    last_attended_on: "2026-03-01",
  },
  created_at: "2025-01-01T10:00:00Z",
  updated_at: "2026-03-01T10:00:00Z",
};

const dashboardSummary = {
  members: {
    total_members: 42,
    active_members: 39,
    inactive_members: 3,
  },
  households: {
    total_households: 15,
    households_with_active_head: 12,
    average_household_size: 3.2,
  },
  groups: {
    total_groups: 6,
    active_groups: 5,
    total_active_affiliations: 28,
    group_membership_counts: [{ id: 1, name: "Choir Ministry", active_membership_count: 12 }],
  },
  attendance: {
    total_events: 8,
    aggregate_men_count: 80,
    aggregate_women_count: 95,
    aggregate_children_count: 40,
    aggregate_visitor_count: 12,
    aggregate_total_attendance: 227,
    total_member_attendance_records: 65,
    event_type_counts: [{ event_type: "SUNDAY_SERVICE", count: 4 }],
  },
  finance: {
    total_fund_accounts: 3,
    balances_by_fund: [{ id: 1, name: "General Fund", code: "GEN", current_balance: "10250.00" }],
    total_income: "16000.00",
    total_expense: "5750.00",
    total_transfers: "2200.00",
    net_flow: "10250.00",
  },
};

const serviceEventListItem = {
  id: 1,
  title: "Sunday Morning Service",
  event_type: "SUNDAY_SERVICE",
  is_system_managed: true,
  service_date: "2026-03-22",
  start_time: "09:00:00",
  end_time: "11:00:00",
  location: "Main Sanctuary",
  is_active: true,
  member_attendance_count: 1,
  has_attendance_summary: true,
};

function successEnvelope(data: unknown, message = "OK") {
  return {
    status: "success",
    message,
    data,
  };
}

function errorEnvelope(message: string) {
  return {
    status: "error",
    message,
    errors: {
      detail: [message],
    },
    data: null,
  };
}

async function fulfillJson(route: Route, payload: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(payload),
  });
}

async function installApiMocks(page: Page, sessionMode: SessionMode) {
  let hasLoggedIn = false;
  let createdMemberDetail = {
    ...baseMemberDetail,
    id: 2,
    first_name: "Grace",
    last_name: "Hopper",
    full_name: "Grace Hopper",
    email: "grace@example.com",
  };

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const path = url.pathname;
    const user = sessionMode === "authenticated-staff" ? staffUser : adminUser;
    const isAuthenticated = sessionMode !== "unauthenticated" || hasLoggedIn;

    if (path === "/api/auth/token/refresh/" && method === "POST") {
      if (!isAuthenticated) {
        await fulfillJson(route, errorEnvelope("Authentication credentials were not provided."), 401);
        return;
      }
      await fulfillJson(route, successEnvelope({ access: "mock-access-token" }, "Token refreshed."));
      return;
    }

    if (path === "/api/auth/me/" && method === "GET") {
      if (!isAuthenticated) {
        await fulfillJson(route, errorEnvelope("Authentication credentials were not provided."), 401);
        return;
      }
      await fulfillJson(route, successEnvelope(user, "Current user fetched."));
      return;
    }

    if (path === "/api/auth/login/" && method === "POST") {
      hasLoggedIn = true;
      await fulfillJson(
        route,
        successEnvelope(
          {
            user: adminUser,
            tokens: { access: "mock-access-token" },
          },
          "Login successful.",
        ),
      );
      return;
    }

    if (path === "/api/auth/signup/" && method === "POST") {
      const payload = JSON.parse(request.postData() || "{}") as {
        username?: string;
        email?: string;
      };
      await fulfillJson(
        route,
        successEnvelope(
          {
            user: {
              id: 3,
              username: payload.username || "new-user",
              first_name: "",
              last_name: "",
              email: payload.email || "new-user@example.com",
              is_active: true,
              is_staff: false,
              is_superuser: false,
              role_names: [],
            },
          },
          "Account created successfully.",
        ),
        201,
      );
      return;
    }

    if (path === "/api/auth/availability/username/" && method === "GET") {
      const username = url.searchParams.get("username") || "";
      const unavailableUsernames = new Set(["church-admin", "attendance-officer"]);
      await fulfillJson(
        route,
        successEnvelope(
          {
            username,
            available: Boolean(username) && !unavailableUsernames.has(username.toLowerCase()),
          },
          "Username availability fetched successfully.",
        ),
      );
      return;
    }

    if (path === "/api/auth/availability/email/" && method === "GET") {
      const email = url.searchParams.get("email") || "";
      const unavailableEmails = new Set(["admin@example.com", "attendance@example.com"]);
      await fulfillJson(
        route,
        successEnvelope(
          {
            email,
            available: Boolean(email) && !unavailableEmails.has(email.toLowerCase()),
          },
          "Email availability fetched successfully.",
        ),
      );
      return;
    }

    if (path === "/api/auth/logout/" && method === "POST") {
      await fulfillJson(route, successEnvelope({}, "Logout successful."));
      return;
    }

    if (!isAuthenticated) {
      await fulfillJson(route, errorEnvelope("Authentication credentials were not provided."), 401);
      return;
    }

    if (path.startsWith("/api/audit/") && sessionMode === "authenticated-staff") {
      await fulfillJson(route, errorEnvelope("You do not have permission to perform this action."), 403);
      return;
    }

    if (path === "/api/reports/dashboard/" && method === "GET") {
      await fulfillJson(route, successEnvelope(dashboardSummary, "Dashboard summary fetched."));
      return;
    }

    if (path === "/api/reports/members/" && method === "GET") {
      await fulfillJson(route, successEnvelope(dashboardSummary.members, "Membership summary fetched."));
      return;
    }

    if (path === "/api/reports/households/" && method === "GET") {
      await fulfillJson(route, successEnvelope(dashboardSummary.households, "Household summary fetched."));
      return;
    }

    if (path === "/api/reports/groups/" && method === "GET") {
      await fulfillJson(route, successEnvelope(dashboardSummary.groups, "Group summary fetched."));
      return;
    }

    if (path === "/api/reports/attendance/" && method === "GET") {
      await fulfillJson(route, successEnvelope(dashboardSummary.attendance, "Attendance summary fetched."));
      return;
    }

    if (path === "/api/reports/finance/" && method === "GET") {
      await fulfillJson(route, successEnvelope(dashboardSummary.finance, "Finance summary fetched."));
      return;
    }

    if (path === "/api/members/" && method === "GET") {
      const memberListData = [
        baseMember,
        {
          id: createdMemberDetail.id,
          first_name: createdMemberDetail.first_name,
          middle_name: createdMemberDetail.middle_name || "",
          last_name: createdMemberDetail.last_name,
          full_name: createdMemberDetail.full_name,
          email: createdMemberDetail.email,
          phone_number: createdMemberDetail.phone_number,
          is_active: createdMemberDetail.is_active,
        },
      ];
      const hasPaginationParams =
        url.searchParams.has("page") || url.searchParams.has("page_size");

      if (!hasPaginationParams) {
        await fulfillJson(route, successEnvelope(memberListData, "Members fetched successfully."));
        return;
      }

      await fulfillJson(
        route,
        successEnvelope(
          {
            count: memberListData.length,
            next: null,
            previous: null,
            page: 1,
            page_size: 10,
            results: memberListData,
          },
          "Members fetched successfully.",
        ),
      );
      return;
    }

    if (path === "/api/members/" && method === "POST") {
      const payload = JSON.parse(request.postData() || "{}") as { first_name?: string; last_name?: string };
      const firstName = payload.first_name || "Grace";
      const lastName = payload.last_name || "Hopper";
      createdMemberDetail = {
        ...createdMemberDetail,
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
      };
      await fulfillJson(route, successEnvelope(createdMemberDetail, "Member created successfully."), 201);
      return;
    }

    if (path === "/api/members/1/" && method === "GET") {
      await fulfillJson(route, successEnvelope(baseMemberDetail, "Member fetched successfully."));
      return;
    }

    if (path === "/api/members/2/" && method === "GET") {
      await fulfillJson(route, successEnvelope(createdMemberDetail, "Member fetched successfully."));
      return;
    }

    if (path === "/api/households/" && method === "GET") {
      await fulfillJson(
        route,
        successEnvelope(
          {
            count: 1,
            next: null,
            previous: null,
            page: 1,
            page_size: 10,
            results: [
              {
                id: 1,
                name: "Lovelace Household",
                primary_phone: "1234567890",
                city: "London",
                is_active: true,
                active_member_count: 3,
              },
            ],
          },
          "Households fetched successfully.",
        ),
      );
      return;
    }

    if (path === "/api/households/1/" && method === "GET") {
      await fulfillJson(
        route,
        successEnvelope(
          {
            id: 1,
            name: "Lovelace Household",
            primary_phone: "1234567890",
            address_line_1: "42 River Street",
            address_line_2: "",
            city: "London",
            notes: "",
            is_active: true,
            members: [
              {
                id: 1,
                member_id: 1,
                first_name: "Ada",
                middle_name: "",
                last_name: "Lovelace",
                email: "ada@example.com",
                phone_number: "1234567890",
                relationship_to_head: "Head",
                is_head: true,
                is_active: true,
                joined_on: "2024-01-01",
                left_on: null,
                notes: "",
              },
            ],
            created_at: "2025-01-01T10:00:00Z",
            updated_at: "2026-03-01T10:00:00Z",
          },
          "Household fetched successfully.",
        ),
      );
      return;
    }

    if (path === "/api/groups/" && method === "GET") {
      await fulfillJson(
        route,
        successEnvelope(
          {
            count: 1,
            next: null,
            previous: null,
            page: 1,
            page_size: 10,
            results: [
              {
                id: 1,
                name: "Choir Ministry",
                description: "Music ministry",
                is_active: true,
                active_member_count: 12,
              },
            ],
          },
          "Groups fetched successfully.",
        ),
      );
      return;
    }

    if (path === "/api/groups/1/" && method === "GET") {
      await fulfillJson(
        route,
        successEnvelope(
          {
            id: 1,
            name: "Choir Ministry",
            description: "Music ministry",
            is_active: true,
            memberships: [
              {
                id: 1,
                member_id: 1,
                first_name: "Ada",
                middle_name: "",
                last_name: "Lovelace",
                email: "ada@example.com",
                role_name: "Member",
                started_on: "2024-02-01",
                ended_on: null,
                is_active: true,
                notes: "",
              },
            ],
            created_at: "2025-01-01T10:00:00Z",
            updated_at: "2026-03-01T10:00:00Z",
          },
          "Group fetched successfully.",
        ),
      );
      return;
    }

    if (path === "/api/attendance/" && method === "GET") {
      const attendanceListData = [serviceEventListItem];
      const hasPaginationParams =
        url.searchParams.has("page") || url.searchParams.has("page_size");

      if (!hasPaginationParams) {
        await fulfillJson(
          route,
          successEnvelope(attendanceListData, "Service events fetched successfully."),
        );
        return;
      }

      await fulfillJson(
        route,
        successEnvelope(
          {
            count: attendanceListData.length,
            next: null,
            previous: null,
            page: 1,
            page_size: 10,
            results: attendanceListData,
          },
          "Service events fetched successfully.",
        ),
      );
      return;
    }

    if (path === "/api/attendance/sunday-service/current/" && method === "GET") {
      await fulfillJson(
        route,
        successEnvelope(serviceEventListItem, "Sunday service fetched successfully."),
      );
      return;
    }

    if (path === "/api/attendance/1/" && method === "GET") {
      await fulfillJson(
        route,
        successEnvelope(
          {
            id: 1,
            title: "Sunday Morning Service",
            event_type: "SUNDAY_SERVICE",
            is_system_managed: true,
            service_date: "2026-03-22",
            start_time: "09:00:00",
            end_time: "11:00:00",
            location: "Main Sanctuary",
            notes: "Weekly gathering",
            is_active: true,
            attendance_summary: {
              id: 1,
              men_count: 40,
              women_count: 55,
              children_count: 20,
              visitor_count: 7,
              total_count: 122,
              notes: "",
              created_at: "2026-03-22T12:00:00Z",
              updated_at: "2026-03-22T12:30:00Z",
            },
            member_attendances: [
              {
                id: 1,
                member_id: 1,
                first_name: "Ada",
                middle_name: "",
                last_name: "Lovelace",
                email: "ada@example.com",
                status: "PRESENT",
                checked_in_at: "2026-03-22T09:10:00Z",
                notes: "",
                created_at: "2026-03-22T09:10:00Z",
                updated_at: "2026-03-22T09:10:00Z",
              },
            ],
            created_at: "2026-03-20T10:00:00Z",
            updated_at: "2026-03-22T12:30:00Z",
          },
          "Service event fetched successfully.",
        ),
      );
      return;
    }

    if (path === "/api/attendance/1/member-attendance/" && method === "GET") {
      await fulfillJson(
        route,
        successEnvelope(
          {
            count: 1,
            next: null,
            previous: null,
            page: 1,
            page_size: 10,
            results: [
              {
                id: 1,
                member_id: 1,
                first_name: "Ada",
                middle_name: "",
                last_name: "Lovelace",
                email: "ada@example.com",
                status: "PRESENT",
                checked_in_at: "2026-03-22T09:10:00Z",
                notes: "",
                created_at: "2026-03-22T09:10:00Z",
                updated_at: "2026-03-22T09:10:00Z",
              },
            ],
          },
          "Member attendance fetched successfully.",
        ),
      );
      return;
    }

    if (path === "/api/finance/fund-accounts/" && method === "GET") {
      await fulfillJson(
        route,
        successEnvelope(
          [
            {
              id: 1,
              name: "General Fund",
              code: "GEN",
              description: "General operations",
              is_active: true,
              current_balance: "10250.00",
            },
            {
              id: 2,
              name: "Welfare Fund",
              code: "WEL",
              description: "Community support",
              is_active: true,
              current_balance: "2800.00",
            },
          ],
          "Fund accounts fetched successfully.",
        ),
      );
      return;
    }

    if (path === "/api/finance/transactions/" && method === "GET") {
      await fulfillJson(
        route,
        successEnvelope(
          {
            count: 1,
            next: null,
            previous: null,
            page: 1,
            page_size: 10,
            results: [
              {
                id: 1,
                reference_no: "TRX-0001",
                transaction_type: "INCOME",
                transaction_date: "2026-03-22",
                description: "Sunday offering",
                service_event_id: 1,
                service_event_title: "Sunday Morning Service",
                posted_at: "2026-03-22T13:00:00Z",
                line_count: 1,
                total_in_amount: "1200.00",
                total_out_amount: "0.00",
              },
            ],
          },
          "Transactions fetched successfully.",
        ),
      );
      return;
    }

    if (path === "/api/finance/transactions/1/" && method === "GET") {
      await fulfillJson(
        route,
        successEnvelope(
          {
            id: 1,
            reference_no: "TRX-0001",
            transaction_type: "INCOME",
            transaction_date: "2026-03-22",
            description: "Sunday offering",
            service_event: {
              id: 1,
              title: "Sunday Morning Service",
              event_type: "SUNDAY_SERVICE",
              service_date: "2026-03-22",
            },
            posted_at: "2026-03-22T13:00:00Z",
            total_in_amount: "1200.00",
            total_out_amount: "0.00",
            lines: [
              {
                id: 1,
                fund_account_id: 1,
                fund_account_name: "General Fund",
                fund_account_code: "GEN",
                direction: "IN",
                amount: "1200.00",
                category_name: "Offering",
                notes: "",
              },
            ],
            created_at: "2026-03-22T13:00:00Z",
            updated_at: "2026-03-22T13:00:00Z",
          },
          "Transaction fetched successfully.",
        ),
      );
      return;
    }

    if (path === "/api/settings/roles/" && method === "GET") {
      await fulfillJson(
        route,
        successEnvelope(
          [
            {
              id: 1,
              name: "Church Admin",
              user_count: 2,
              permissions: [
                {
                  id: 1,
                  app_label: "members",
                  codename: "view_member",
                  name: "Can view member",
                  permission_code: "members.view_member",
                },
              ],
            },
          ],
          "Role summaries fetched successfully.",
        ),
      );
      return;
    }

    if (path === "/api/settings/staff-users/" && method === "GET") {
      await fulfillJson(
        route,
        successEnvelope(
          [
            {
              id: 1,
              username: "church-admin",
              first_name: "Church",
              last_name: "Admin",
              full_name: "Church Admin",
              email: "admin@example.com",
              is_active: true,
              is_staff: true,
              is_superuser: false,
              role_names: ["Church Admin"],
              roles: [{ id: 1, name: "Church Admin" }],
              last_login: "2026-03-26T10:00:00Z",
              date_joined: "2025-01-10T09:00:00Z",
            },
          ],
          "Staff users fetched successfully.",
        ),
      );
      return;
    }

    if (path === "/api/audit/events/" && method === "GET") {
      await fulfillJson(
        route,
        successEnvelope(
          {
            count: 1,
            next: null,
            previous: null,
            page: 1,
            page_size: 20,
            results: [
              {
                id: 1,
                event_type: "settings.staff_user.updated",
                target_type: "staff_user",
                target_id: 1,
                summary: "Staff user updated",
                payload: { changed_fields: ["role_ids"] },
                created_at: "2026-03-26T11:20:00Z",
                actor: {
                  id: 1,
                  username: "church-admin",
                  full_name: "Church Admin",
                },
              },
            ],
          },
          "Audit events fetched successfully.",
        ),
      );
      return;
    }

    await fulfillJson(route, errorEnvelope(`No mock configured for ${method} ${path}`), 404);
  });
}

test.describe("frontend-next parity smoke", () => {
  test("redirects unauthenticated users from protected routes", async ({ page }) => {
    await installApiMocks(page, "unauthenticated");
    await page.goto("/members");
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });

  test("supports login and dashboard bootstrap flow", async ({ page }) => {
    await installApiMocks(page, "unauthenticated");
    await page.goto("/login");
    const loginResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/auth/login/") &&
        response.request().method() === "POST",
    );
    await page.getByLabel("Username or email").fill("church-admin");
    await page.getByLabel("Password").fill("P@ssw0rd!");
    await page.getByRole("button", { name: "Sign in" }).click();
    const loginResponse = await loginResponsePromise;
    expect(loginResponse.ok()).toBeTruthy();
    await expect(page.getByRole("heading", { name: "Operational dashboard" })).toBeVisible({
      timeout: 15000,
    });
    await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/, { timeout: 15000 });
  });

  test("supports public signup flow", async ({ page }) => {
    await installApiMocks(page, "unauthenticated");
    await page.goto("/signup");
    const signupResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/auth/signup/") &&
        response.request().method() === "POST",
    );
    await page.getByLabel("Username").fill("new-basic-user");
    await page.getByLabel("Email").fill("new-basic-user@example.com");
    await page.getByLabel("Password").fill("StrongPass123!");
    await page.getByLabel("Confirm password").fill("StrongPass123!");
    await page.getByRole("button", { name: "Create account" }).click();
    const signupResponse = await signupResponsePromise;
    expect(signupResponse.ok()).toBeTruthy();
    await expect(page.getByRole("heading", { name: "Account created" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Continue to sign in" })).toBeVisible();
  });

  test("loads all migrated routes for admin users", async ({ page }) => {
    // This sweep touches every migrated route and compiles multiple pages in dev mode.
    // Keep assertions strict, but allow enough budget to avoid false failures on slower filesystems.
    test.setTimeout(240000);
    await installApiMocks(page, "authenticated-admin");
    await page.goto("/dashboard");

    await expect(page.getByRole("link", { name: "Audit" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Operational dashboard" })).toBeVisible();

    const routeChecks: Array<{ path: string; heading: string }> = [
      { path: "/members", heading: "Members" },
      { path: "/members/new", heading: "Create member" },
      { path: "/members/1", heading: "Ada Lovelace" },
      { path: "/members/1/edit", heading: "Edit member" },
      { path: "/households", heading: "Households" },
      { path: "/households/1", heading: "Lovelace Household" },
      { path: "/groups", heading: "Ministries" },
      { path: "/groups/1", heading: "Choir Ministry" },
      { path: "/events", heading: "Events" },
      { path: "/events/1", heading: "Sunday Morning Service" },
      { path: "/attendance", heading: "Attendance" },
      { path: "/events/1/attendance", heading: "Sunday Morning Service" },
      { path: "/finance", heading: "Ledger" },
      { path: "/finance/entries/income", heading: "Record income" },
      { path: "/finance/entries/expense", heading: "Record expense" },
      { path: "/finance/transfers/new", heading: "Fund transfer" },
      { path: "/finance/transactions/1", heading: "TRX-0001" },
      { path: "/reports", heading: "Reports" },
      { path: "/settings/roles", heading: "Roles" },
      { path: "/settings/staff", heading: "Staff users" },
      { path: "/audit", heading: "Audit events" },
    ];

    for (const routeCheck of routeChecks) {
      await page.goto(routeCheck.path, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: routeCheck.heading }).first()).toBeVisible({
        timeout: 15000,
      });
    }
  });

  test("executes a representative member create flow", async ({ page }) => {
    await installApiMocks(page, "authenticated-admin");
    await page.goto("/members/new");

    const createMemberResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/members/") &&
        response.request().method() === "POST",
    );
    await page.getByLabel("First name").fill("Grace");
    await page.getByLabel("Last name").fill("Hopper");
    await page.getByRole("button", { name: "Create member" }).click();
    const createMemberResponse = await createMemberResponsePromise;
    expect(createMemberResponse.ok()).toBeTruthy();

    await expect(page.getByRole("heading", { name: "Grace Hopper" }).first()).toBeVisible({
      timeout: 30000,
    });
    await expect(page).toHaveURL(/\/members\/2(?:\?.*)?$/, { timeout: 30000 });
  });

  test("keeps audit navigation hidden for non-audit roles", async ({ page }) => {
    await installApiMocks(page, "authenticated-staff");
    await page.goto("/dashboard");

    await expect(page.getByRole("link", { name: "Audit" })).toHaveCount(0);

    await page.goto("/audit");
    await expect(page.getByRole("heading", { name: "Audit trail could not be loaded" })).toBeVisible();
  });
});
