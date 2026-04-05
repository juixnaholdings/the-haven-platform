import type { User } from "@/domains/types";

export function hasStaffOrAdminAccess(user: User | null | undefined) {
  if (!user) {
    return false;
  }

  if (user.is_superuser || user.is_staff) {
    return true;
  }

  return (user.role_names?.length ?? 0) > 0;
}

