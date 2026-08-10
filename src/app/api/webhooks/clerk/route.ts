import { NextRequest } from "next/server";
import { Webhook } from "svix";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { buildVendorProfileSeed } from "@/lib/vendor-profile";
import type { UserRole } from "@/lib/auth-types";
import { normalizeRole } from "@/lib/role-utils";
import type { Database } from "@/types/database.types";

type DatabaseUserRole = Database["public"]["Enums"]["user_role"];
type UserInsert = Database["public"]["Tables"]["users"]["Insert"];
type UserUpdate = Database["public"]["Tables"]["users"]["Update"];

const DATABASE_ROLE_BY_APP_ROLE = {
  client: "CLIENT",
  vendor: "VENDOR",
  admin: "ADMIN",
  manager: "MANAGER",
} as const satisfies Record<UserRole, DatabaseUserRole>;

type ClerkUserEvent = {
  data: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    email_addresses?: { email_address: string; id: string }[];
    primary_email_address_id?: string | null;
    image_url?: string | null;
    public_metadata?: { role?: string };
  };
  type: string;
};

export async function POST(request: NextRequest) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error("CLERK_WEBHOOK_SECRET not set");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  // Verify the webhook signature
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const body = await request.text();

  let event: ClerkUserEvent;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkUserEvent;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const { data: userData } = event;

  if (event.type === "user.deleted") {
    try {
      // Clerk access is gone, but the local identity stays as an inactive
      // historical anchor for bookings, pricing, reviews, and messages.
      const deactivation: UserUpdate = {
        is_active: false,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("users")
        .update(deactivation)
        .eq("id", userData.id);

      if (error) throw error;
      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("User deactivation error:", error);
      return new Response("Internal error", { status: 500 });
    }
  }

  const emailAddresses = userData.email_addresses ?? [];
  const primaryEmail =
    emailAddresses.find((email) => email.id === userData.primary_email_address_id)
      ?.email_address ??
    emailAddresses[0]?.email_address ??
    null;

  const requestedRole = normalizeRole(userData.public_metadata?.role) ?? "client";
  const displayName =
    [userData.first_name, userData.last_name].filter(Boolean).join(" ").trim() ||
    primaryEmail?.split("@")[0] ||
    "User";

  try {
    if (event.type === "user.created" || event.type === "user.updated") {
      if (!primaryEmail) {
        console.error(`Clerk user ${userData.id} has no primary email`);
        return new Response("Primary email is required", { status: 400 });
      }

      const identityRecord = {
        email: primaryEmail,
        name: displayName,
        avatar: userData.image_url ?? null,
      } satisfies UserUpdate;
      let databaseRole: DatabaseUserRole;

      if (event.type === "user.created") {
        const { data: existingUser, error: existingUserError } = await supabase
          .from("users")
          .select("role")
          .eq("id", userData.id)
          .maybeSingle();
        if (existingUserError) {
          console.error("User replay lookup error:", existingUserError);
          return new Response("User create failed", { status: 500 });
        }

        if (existingUser) {
          // Clerk retries delivery. A replay must never restore an older role or
          // reactivate an account that operations has since suspended.
          const { data: replayedUser, error: replayError } = await supabase
            .from("users")
            .update(identityRecord)
            .eq("id", userData.id)
            .select("role")
            .single();
          if (replayError) {
            console.error("User create replay error:", replayError);
            return new Response("User create failed", { status: 500 });
          }
          databaseRole = replayedUser.role;
        } else {
          const userRecord: UserInsert = {
            id: userData.id,
            ...identityRecord,
            role: DATABASE_ROLE_BY_APP_ROLE[requestedRole],
            is_active: true,
          };
          const { data: createdUser, error: userErr } = await supabase
            .from("users")
            .insert(userRecord)
            .select("role")
            .single();
          if (userErr) {
            console.error("User create error:", userErr);
            return new Response("User create failed", { status: 500 });
          }
          databaseRole = createdUser.role;
        }
      } else {
        // Supabase is the authorization source of truth. Clerk identity events
        // may update names, emails, and avatars, but never restore a stale role.
        const { data: updatedUser, error: updateErr } = await supabase
          .from("users")
          .update(identityRecord)
          .eq("id", userData.id)
          .select("role")
          .maybeSingle();
        if (updateErr) {
          console.error("User identity update error:", updateErr);
          return new Response("User update failed", { status: 500 });
        }

        if (updatedUser) {
          databaseRole = updatedUser.role;
        } else {
          const recoveryRecord: UserInsert = {
            id: userData.id,
            ...identityRecord,
            role: DATABASE_ROLE_BY_APP_ROLE[requestedRole],
          };
          const { data: recoveredUser, error: recoveryErr } = await supabase
            .from("users")
            .insert(recoveryRecord)
            .select("role")
            .single();
          if (recoveryErr) {
            console.error("User recovery error:", recoveryErr);
            return new Response("User recovery failed", { status: 500 });
          }
          databaseRole = recoveredUser.role;
        }
      }

      const effectiveRole =
        databaseRole === "VENDOR"
          ? "vendor"
          : databaseRole === "ADMIN"
            ? "admin"
            : databaseRole === "MANAGER"
              ? "manager"
              : "client";

      /*
       * Profile creation follows the stored role, not possibly stale Clerk
       * metadata. Historical profiles are retained if operations changes a role.
       */
      if (effectiveRole === "client") {
        const { data: existing, error: profileLookupError } = await supabase
          .from("client_profiles")
          .select("id")
          .eq("user_id", userData.id)
          .maybeSingle();

        if (profileLookupError) throw profileLookupError;

        if (!existing) {
          const { error: profileInsertError } = await supabase
            .from("client_profiles")
            .insert({
              user_id: userData.id,
            });
          if (profileInsertError) {
            throw new Error(`Failed to create client profile for ${userData.id}`);
          }
        }
      } else if (effectiveRole === "vendor") {
        const { data: existing, error: profileLookupError } = await supabase
          .from("vendor_profiles")
          .select("id")
          .eq("user_id", userData.id)
          .maybeSingle();

        if (profileLookupError) throw profileLookupError;

        if (!existing) {
          const seed = await buildVendorProfileSeed(supabase, {
            businessName: displayName,
            userId: userData.id,
          });

          const { error: profileInsertError } = await supabase
            .from("vendor_profiles")
            .insert({
              user_id: userData.id,
              ...seed,
            });
          if (profileInsertError) {
            throw new Error(`Failed to create vendor profile for ${userData.id}`);
          }
        }
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return new Response("Internal error", { status: 500 });
  }
}
