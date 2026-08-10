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
import type { Database } from "@/types/database.types";

type DatabaseUserRole = Database["public"]["Enums"]["user_role"];

const DATABASE_ROLE_BY_APP_ROLE = {
  client: "CLIENT",
  vendor: "VENDOR",
  admin: "ADMIN",
  manager: "MANAGER",
} as const satisfies Record<UserRole, DatabaseUserRole>;

const APP_ROLE_BY_DATABASE_ROLE = {
  CLIENT: "client",
  VENDOR: "vendor",
  ADMIN: "admin",
  MANAGER: "manager",
} as const satisfies Record<DatabaseUserRole, UserRole>;

export type AuthSession = {
  userId: string;
  role: UserRole;
};

export type AuthSessionState =
  | { state: "authenticated"; session: AuthSession }
  | { state: "unauthenticated" }
  | { state: "inactive" }
  | { state: "unavailable" };

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
  // Supabase is the authorization source of truth. Clerk metadata can lag after
  // an operations role change, so claims are only a fallback for unsynced users.
  let role = storedRole ?? roleFromSessionClaims(sessionClaims);

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
  const result = await getAuthSessionState();
  return result.state === "authenticated" ? result.session : null;
}

export async function getAuthSessionState(): Promise<AuthSessionState> {
  const testSession = await getTestAuthSession();
  if (testSession) {
    return { state: "authenticated", session: testSession };
  }

  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return { state: "unauthenticated" };
  }

  const storedUser = await fetchUserAuthorization(userId);
  if (storedUser.state === "error") {
    return { state: "unavailable" };
  }
  if (storedUser.state === "found" && !storedUser.isActive) {
    return { state: "inactive" };
  }

  return {
    state: "authenticated",
    session: {
      userId,
      role: await resolveRole(
        userId,
        sessionClaims as Record<string, unknown> | undefined,
        storedUser.state === "found" ? storedUser.role : null
      ),
    },
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
    const rolesToTry: readonly DatabaseUserRole[] =
      role === "manager"
        ? ["MANAGER", "ADMIN"]
        : [DATABASE_ROLE_BY_APP_ROLE[role]];

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
 * Get an active authenticated Clerk session or a precise auth failure response.
 * Role: Supabase `users.role` → JWT claims → Clerk publicMetadata.
 */
export async function getAuthSession(): Promise<AuthSession | NextResponse> {
  const result = await getAuthSessionState();
  if (result.state === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (result.state === "inactive") {
    return NextResponse.json({ error: "Account is inactive" }, { status: 403 });
  }
  if (result.state === "unavailable") {
    return NextResponse.json(
      { error: "Authorization service is temporarily unavailable" },
      { status: 503 }
    );
  }

  return result.session;
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
      role: APP_ROLE_BY_DATABASE_ROLE[data.role],
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
