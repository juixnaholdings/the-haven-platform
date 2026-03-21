import { authApi } from "../src/domains/auth/api";
import { membersApi } from "../src/domains/members/api";
import { reportingApi } from "../src/domains/reporting/api";
import { clearStoredTokens, saveStoredTokens } from "../src/auth/storage";

const username = process.env.FRONTEND_VERIFY_USERNAME;
const password = process.env.FRONTEND_VERIFY_PASSWORD;

async function main() {
  if (!username || !password) {
    throw new Error(
      "FRONTEND_VERIFY_USERNAME and FRONTEND_VERIFY_PASSWORD must be set before running verify:backend.",
    );
  }

  clearStoredTokens();

  const loginResponse = await authApi.login({
    username,
    password,
  });

  saveStoredTokens(loginResponse.tokens);

  const currentUser = await authApi.getCurrentUser();
  const dashboard = await reportingApi.getDashboardOverview();
  const members = await membersApi.listMembers();

  console.log(
    JSON.stringify(
      {
        apiBaseUrl:
          process.env.VITE_API_BASE_URL || process.env.FRONTEND_API_BASE_URL || "http://127.0.0.1:8000",
        user: currentUser.username,
        dashboardMembers: dashboard.members.total_members,
        dashboardEvents: dashboard.attendance.total_events,
        fetchedMembers: members.length,
      },
      null,
      2,
    ),
  );

  try {
    await authApi.logout({ refresh: loginResponse.tokens.refresh });
  } catch {
    // The verification goal is successful login plus protected data access.
  } finally {
    clearStoredTokens();
  }
}

main().catch((error) => {
  console.error("Frontend/backend verification failed.");
  console.error(error);
  clearStoredTokens();
  process.exitCode = 1;
});
