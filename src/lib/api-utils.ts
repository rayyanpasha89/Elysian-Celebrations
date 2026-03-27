import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import type { UserRole } from "@/lib/auth-types";

/**
 * Get the authenticated Clerk session or return a 401 response.
 */
export async function getAuthSession() {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return {
    userId,
    role: (sessionClaims?.metadata as { role?: UserRole })?.role ?? "client",
  };
}

/**
 * Require a specific role or return 403.
 */
export function requireRole(
  session: { role: string },
  ...roles: string[]
) {
  if (!roles.includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

/**
 * Standard error response.
 */
export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Standard success response.
 */
export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
