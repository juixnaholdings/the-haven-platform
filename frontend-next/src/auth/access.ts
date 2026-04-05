import type { User } from "@/domains/types";

const SETTINGS_ADMIN_ROLE_NAMES = new Set(["Super Admin", "Church Admin"]);

export function hasStaffOrAdminAccess(user: User | null | undefined) {
  if (!user) {
    return false;
  }

  if (user.is_superuser || user.is_staff) {
    return true;
  }

  return (user.role_names?.length ?? 0) > 0;
}

export function hasSettingsAdminAccess(user: User | null | undefined) {
  if (!user) {
    return false;
  }

  if (user.is_superuser) {
    return true;
  }

  return (user.role_names ?? []).some((roleName) =>
    SETTINGS_ADMIN_ROLE_NAMES.has(roleName),
  );
}
