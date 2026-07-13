import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import type { UserRole } from "@/lib/auth-types";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { normalizeRole, roleFromSessionClaims } from "@/lib/role-utils";
import {
  isTestAuthEnabled,
  TEST_AUTH_COOKIE,
  testAuthRoleFromValue,
} from "@/lib/test-auth";

export type AuthSession = {
  userId: string;
  role: UserRole;
};

type StoredUserAuthorization = {
  role: UserRole | null;
  isActive: boolean;
};

type StoredUserAuthorizationLookup =
  | ({ state: "found" } & StoredUserAuthorization)
  | { state: "missing" }
  | { state: "error" };

const testUserCache: Partial<Record<UserRole, string>> = {};

async function resolveRole(
  userId: string,
  sessionClaims: Record<string, unknown> | undefined,
  storedRole: UserRole | null
): Promise<UserRole> {
  let role = roleFromSessionClaims(sessionClaims);

  if (!role) {
    role = storedRole;
  }

  if (!role) {
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      role = normalizeRole(user.publicMetadata?.role);
    } catch {
      role = null;
    }
  }

  return role ?? "client";
}

export async function getOptionalAuthSession(): Promise<AuthSession | null> {
  const testSession = await getTestAuthSession();
  if (testSession) {
    return testSession;
  }

  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return null;
  }

  const storedUser = await fetchUserAuthorization(userId);
  if (storedUser.state === "error") {
    return null;
  }
  if (storedUser.state === "found" && !storedUser.isActive) {
    return null;
  }

  return {
    userId,
    role: await resolveRole(
      userId,
      sessionClaims as Record<string, unknown> | undefined,
      storedUser.state === "found" ? storedUser.role : null
    ),
  };
}

async function getTestAuthSession(): Promise<AuthSession | null> {
  if (!isTestAuthEnabled()) return null;

  const cookieStore = await cookies();
  const role = testAuthRoleFromValue(cookieStore.get(TEST_AUTH_COOKIE)?.value);
  const userId = await resolveTestAuthUserId(role);

  return {
    userId,
    role,
  };
}

async function resolveTestAuthUserId(role: UserRole): Promise<string> {
  const envKey = `ELYSIAN_TEST_AUTH_${role.toUpperCase()}_USER_ID`;
  const configuredId = process.env[envKey]?.trim();
  if (configuredId) return configuredId;

  if (testUserCache[role]) return testUserCache[role];

  try {
    const supabase = createAdminSupabaseClient();
    const rolesToTry = role === "manager" ? ["MANAGER", "ADMIN"] : [role.toUpperCase()];

    for (const dbRole of rolesToTry) {
      const { data } = await supabase
        .from("users")
        .select("id")
        .eq("role", dbRole)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (data?.id && typeof data.id === "string") {
        testUserCache[role] = data.id;
        return data.id;
      }
    }
  } catch {
    // Keep the bypass usable even before fixture data is bootstrapped.
  }

  return `test-${role}`;
}

/**
 * Get an active authenticated Clerk session or return a 401 response.
 * Role: JWT claims → Supabase `users.role` → Clerk publicMetadata.
 */
export async function getAuthSession(): Promise<AuthSession | NextResponse> {
  const session = await getOptionalAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return session;
}

async function fetchUserAuthorization(
  userId: string
): Promise<StoredUserAuthorizationLookup> {
  try {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("users")
      .select("role, is_active")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      console.error("User authorization lookup failed:", error);
      return { state: "error" };
    }
    if (!data) return { state: "missing" };
    return {
      state: "found",
      role: normalizeRole(data.role as string),
      isActive: data.is_active !== false,
    };
  } catch {
    return { state: "error" };
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
