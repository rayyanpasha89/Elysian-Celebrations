import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  getAuthSession,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";
import type { Database } from "@/types/database.types";

type UserUpdate = Database["public"]["Tables"]["users"]["Update"];
type ValidRole = NonNullable<UserUpdate["role"]>;

const VALID_ROLES = ["CLIENT", "VENDOR", "MANAGER", "ADMIN"] as const satisfies readonly ValidRole[];

function isValidRole(value: string): value is ValidRole {
  return VALID_ROLES.some((role) => role === value);
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "admin");
  if (roleCheck) return roleCheck;

  const { id } = await ctx.params;
  if (!id) return apiError("Invalid id", 400);
  if (id === session.userId) {
    return apiError("You cannot suspend your own account", 400);
  }

  try {
    const supabase = createAdminSupabaseClient();
    const body = (await request.json()) as { isActive?: unknown; role?: unknown };

    if (typeof body.isActive !== "boolean" && typeof body.role !== "string") {
      return apiError("Provide isActive or role", 400);
    }

    const updates: UserUpdate = {};
    let requestedRole: ValidRole | null = null;
    if (typeof body.isActive === "boolean") updates.is_active = body.isActive;

    if (typeof body.role === "string") {
      const role = body.role.toUpperCase();
      if (!isValidRole(role)) return apiError("Invalid role", 400);
      updates.role = role;
      requestedRole = role;
    }

    const { data: user, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", id)
      .select("id, name, email, role, is_active, created_at")
      .maybeSingle();

    if (error) {
      console.error("users update:", error);
      return apiError("Failed to update user", 500);
    }
    if (!user) {
      return apiError("User not found", 404);
    }

    let clerkMetadataSynced = true;
    if (requestedRole) {
      try {
        const clerk = await clerkClient();
        await clerk.users.updateUserMetadata(id, {
          publicMetadata: { role: requestedRole.toLowerCase() },
        });
      } catch (e) {
        clerkMetadataSynced = false;
        console.error("Clerk metadata update failed:", e);
      }
    }

    return apiSuccess({
      user,
      clerkMetadataSynced,
      warning: clerkMetadataSynced
        ? null
        : "Access was updated, but Clerk routing metadata still needs synchronization.",
    });
  } catch (e) {
    console.error("PATCH /api/admin/users/[id]", e);
    return apiError("Internal server error", 500);
  }
}
