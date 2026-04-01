import type { UserRole } from "@/lib/auth-types";

const ROLES: UserRole[] = ["client", "vendor", "admin", "manager"];

export function normalizeRole(value: unknown): UserRole | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const lower = value.trim().toLowerCase();
  if (ROLES.includes(lower as UserRole)) return lower as UserRole;
  return null;
}

/**
 * Resolve app role from Clerk JWT session claims (custom template or defaults).
 */
export function roleFromSessionClaims(
  sessionClaims: Record<string, unknown> | null | undefined
): UserRole | null {
  if (!sessionClaims || typeof sessionClaims !== "object") return null;
  const c = sessionClaims;

  const meta = c.metadata as { role?: unknown } | undefined;
  const fromMeta = normalizeRole(meta?.role);
  if (fromMeta) return fromMeta;

  const pm = c.publicMetadata as { role?: unknown } | undefined;
  const fromPm = normalizeRole(pm?.role);
  if (fromPm) return fromPm;

  const legacy = c.public_metadata as { role?: unknown } | undefined;
  return normalizeRole(legacy?.role);
}

export function portalPathForRole(role: UserRole): string {
  if (role === "admin") return "/admin";
  if (role === "vendor") return "/vendor";
  if (role === "manager") return "/manager";
  return "/client";
}

/** Topbar label from Clerk `publicMetadata.role`. */
export function dashboardRoleLabel(role: unknown, fallback: string): string {
  if (typeof role !== "string") return fallback;
  const r = role.toLowerCase();
  if (r === "client") return "Couple";
  if (r === "vendor") return "Vendor";
  if (r === "admin") return "Admin";
  if (r === "manager") return "Manager";
  return fallback;
}

/**
 * If the user should not access this portal path, return the path to redirect to.
 */
export function portalMismatchRedirectPath(
  pathname: string,
  role: UserRole
): string | null {
  const path = pathname.replace(/\/$/, "") || "/";
  if (path.startsWith("/admin")) {
    if (role === "admin") return null;
    return portalPathForRole(role);
  }
  if (path.startsWith("/manager")) {
    if (role === "manager" || role === "admin") return null;
    return portalPathForRole(role);
  }
  if (path.startsWith("/vendor")) {
    if (role === "vendor") return null;
    if (role === "admin") return "/admin";
    return portalPathForRole(role);
  }
  if (path.startsWith("/client")) {
    if (role === "client") return null;
    if (role === "admin") return "/admin";
    return portalPathForRole(role);
  }
  return null;
}
