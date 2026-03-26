import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "../auth/ProtectedRoute";
import { AttendancePage } from "../pages/AttendancePage";
import { DashboardPage } from "../pages/DashboardPage";
import { EventAttendancePage } from "../pages/EventAttendancePage";
import { EventDetailPage } from "../pages/EventDetailPage";
import { EventsPage } from "../pages/EventsPage";
import { GroupDetailPage } from "../pages/GroupDetailPage";
import { GroupsPage } from "../pages/GroupsPage";
import { HouseholdDetailPage } from "../pages/HouseholdDetailPage";
import { HouseholdsPage } from "../pages/HouseholdsPage";
import { LoginPage } from "../pages/LoginPage";
import { MemberDetailPage } from "../pages/MemberDetailPage";
import { MemberFormPage } from "../pages/MemberFormPage";
import { MembersPage } from "../pages/MembersPage";
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
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
