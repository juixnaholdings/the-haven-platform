import { clearAccessToken, setAccessToken } from "../src/auth/storage";
import { authApi } from "../src/domains/auth/api";
import { membersApi } from "../src/domains/members/api";
import { reportingApi } from "../src/domains/reporting/api";

const username = process.env.FRONTEND_VERIFY_USERNAME;
const password = process.env.FRONTEND_VERIFY_PASSWORD;

async function main() {
  if (!username || !password) {
    throw new Error(
      "FRONTEND_VERIFY_USERNAME and FRONTEND_VERIFY_PASSWORD must be set before running verify:backend.",
    );
  }

  clearAccessToken();

  const loginResponse = await authApi.login({
    username,
    password,
  });

  setAccessToken(loginResponse.tokens.access);

  const [currentUser, dashboard, members] = await Promise.all([
    authApi.getCurrentUser(),
    reportingApi.getDashboardOverview(),
    membersApi.listMembers(),
  ]);

  console.log(
    JSON.stringify(
      {
        apiBaseUrl:
          process.env.VITE_API_BASE_URL ||
          process.env.FRONTEND_API_BASE_URL ||
          "http://localhost:8000",
        user: currentUser.username,
        dashboardMembers: dashboard.members.total_members,
        dashboardEvents: dashboard.attendance.total_events,
        fetchedMembers: members.length,
      },
      null,
      2,
    ),
  );

  clearAccessToken();
}

main().catch((error) => {
  console.error("Frontend/backend verification failed.");
  console.error(error);
  clearAccessToken();
  process.exitCode = 1;
});
