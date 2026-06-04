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
  const enabled =
    process.env.ELYSIAN_TEST_AUTH_BYPASS === "1" ||
    process.env.ELYSIAN_TEST_AUTH_BYPASS === "true";

  if (!enabled) return false;

  const allowProduction =
    process.env.ELYSIAN_TEST_AUTH_ALLOW_PRODUCTION === "1" ||
    process.env.ELYSIAN_TEST_AUTH_ALLOW_PRODUCTION === "true";

  return process.env.NODE_ENV !== "production" || allowProduction;
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
