import { ProtectedDashboardShell } from "@/auth/protected-dashboard-shell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedDashboardShell>{children}</ProtectedDashboardShell>;
}
