import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import type { UserRole } from "@/lib/auth-types";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { normalizeRole, roleFromSessionClaims } from "@/lib/role-utils";

export type AuthSession = {
  userId: string;
  role: UserRole;
};

async function resolveRole(
  userId: string,
  sessionClaims: Record<string, unknown> | undefined
): Promise<UserRole> {
  let role = roleFromSessionClaims(sessionClaims);

  if (!role) {
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      role = normalizeRole(user.publicMetadata?.role);
    } catch {
      role = null;
    }
  }

  if (!role) {
    role = await fetchRoleFromSupabase(userId);
  }

  return role ?? "client";
}

export async function getOptionalAuthSession(): Promise<AuthSession | null> {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return null;
  }

  return {
    userId,
    role: await resolveRole(
      userId,
      sessionClaims as Record<string, unknown> | undefined
    ),
  };
}

/**
 * Get the authenticated Clerk session or return a 401 response.
 * Role: JWT claims → Clerk publicMetadata → Supabase `users.role`.
 */
export async function getAuthSession(): Promise<AuthSession | NextResponse> {
  const session = await getOptionalAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return session;
}

async function fetchRoleFromSupabase(userId: string): Promise<UserRole | null> {
  try {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (error || !data?.role) return null;
    return normalizeRole(data.role as string);
  } catch {
    return null;
  }
}

/**
 * Require a specific role or return 403.
 */
export function requireRole(session: { role: string }, ...roles: string[]) {
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
