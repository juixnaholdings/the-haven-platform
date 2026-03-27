"use client";

import { AuthSessionProvider } from "@/auth/session-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <AuthSessionProvider>{children}</AuthSessionProvider>;
}
