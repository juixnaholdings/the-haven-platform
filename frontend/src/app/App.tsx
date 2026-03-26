import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "../auth/ProtectedRoute";
import { AttendancePage } from "../pages/AttendancePage";
import { DashboardPage } from "../pages/DashboardPage";
import { EventAttendancePage } from "../pages/EventAttendancePage";
import { EventDetailPage } from "../pages/EventDetailPage";
import { EventsPage } from "../pages/EventsPage";
import { FinanceEntryPage } from "../pages/FinanceEntryPage";
import { FinancePage } from "../pages/FinancePage";
import { FinanceTransferPage } from "../pages/FinanceTransferPage";
import { GroupDetailPage } from "../pages/GroupDetailPage";
import { GroupsPage } from "../pages/GroupsPage";
import { HouseholdDetailPage } from "../pages/HouseholdDetailPage";
import { HouseholdsPage } from "../pages/HouseholdsPage";
import { LoginPage } from "../pages/LoginPage";
import { MemberDetailPage } from "../pages/MemberDetailPage";
import { MemberFormPage } from "../pages/MemberFormPage";
import { MembersPage } from "../pages/MembersPage";
import { ReportsPage } from "../pages/ReportsPage";
import { SettingsRolesPage } from "../pages/SettingsRolesPage";
import { SettingsStaffPage } from "../pages/SettingsStaffPage";
import { TransactionDetailPage } from "../pages/TransactionDetailPage";
import { AppShell } from "./AppShell";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/members" element={<MembersPage />} />
            <Route path="/members/new" element={<MemberFormPage />} />
            <Route path="/members/:memberId" element={<MemberDetailPage />} />
            <Route path="/members/:memberId/edit" element={<MemberFormPage />} />
            <Route path="/households" element={<HouseholdsPage />} />
            <Route path="/households/:householdId" element={<HouseholdDetailPage />} />
            <Route path="/groups" element={<GroupsPage />} />
            <Route path="/groups/:groupId" element={<GroupDetailPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/events/:serviceEventId" element={<EventDetailPage />} />
            <Route path="/events/:serviceEventId/attendance" element={<EventAttendancePage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/finance" element={<FinancePage />} />
            <Route path="/finance/entries/income" element={<FinanceEntryPage entryType="income" />} />
            <Route path="/finance/entries/expense" element={<FinanceEntryPage entryType="expense" />} />
            <Route path="/finance/transfers/new" element={<FinanceTransferPage />} />
            <Route path="/finance/transactions/:transactionId" element={<TransactionDetailPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings/roles" element={<SettingsRolesPage />} />
            <Route path="/settings/staff" element={<SettingsStaffPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
