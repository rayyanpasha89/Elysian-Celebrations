import type { UserRole } from "@/lib/auth-types";
import { normalizeRole } from "@/lib/role-utils";

export const TEST_AUTH_COOKIE = "ec_test_role";
export const TEST_AUTH_QUERY_PARAM = "testRole";
export const TEST_AUTH_ROLES: UserRole[] = [
  "client",
  "vendor",
  "manager",
  "admin",
];

export function isTestAuthEnabled() {
  // Test-role switching is a local development convenience only. Never honor
  // a bypass flag in a production build, even if a deployment environment was
  // accidentally copied from a developer machine.
  if (process.env.NODE_ENV === "production") return false;

  const enabled =
    process.env.ELYSIAN_TEST_AUTH_BYPASS === "1" ||
    process.env.ELYSIAN_TEST_AUTH_BYPASS === "true";

  return enabled;
}

export function testAuthDefaultRole(): UserRole {
  return normalizeRole(process.env.ELYSIAN_TEST_AUTH_DEFAULT_ROLE) ?? "client";
}

export function testAuthRoleFromValue(value: unknown): UserRole {
  return normalizeRole(value) ?? testAuthDefaultRole();
}

export function testAuthLabelForRole(role: UserRole) {
  if (role === "client") return "Couple";
  if (role === "vendor") return "Vendor";
  if (role === "manager") return "Manager";
  return "Admin";
}
