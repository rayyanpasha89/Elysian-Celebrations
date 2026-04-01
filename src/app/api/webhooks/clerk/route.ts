import { NextRequest } from "next/server";
import { Webhook } from "svix";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { buildVendorProfileSeed } from "@/lib/vendor-profile";

type ClerkUserEvent = {
  data: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email_addresses: { email_address: string; id: string }[];
    primary_email_address_id: string | null;
    image_url: string | null;
    public_metadata: { role?: string };
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

  const primaryEmail = userData.email_addresses.find(
    (e) => e.id === userData.primary_email_address_id
  )?.email_address ?? userData.email_addresses[0]?.email_address ?? null;

  const role = (userData.public_metadata?.role?.toLowerCase() ?? "client") as
    | "client"
    | "vendor"
    | "admin"
    | "manager";
  const displayName =
    [userData.first_name, userData.last_name].filter(Boolean).join(" ").trim() ||
    primaryEmail?.split("@")[0] ||
    "User";

  try {
    if (event.type === "user.created" || event.type === "user.updated") {
      // Upsert user record
      const { error: userErr } = await supabase.from("users").upsert(
        {
          id: userData.id,
          email: primaryEmail,
          name: displayName,
          role: role.toUpperCase(),
          avatar: userData.image_url,
        },
        { onConflict: "id" }
      );

      if (userErr) {
        console.error("User upsert error:", userErr);
        return new Response("User upsert failed", { status: 500 });
      }

      // Auto-create profile if it doesn't exist
      if (role === "client") {
        const { data: existing } = await supabase
          .from("client_profiles")
          .select("id")
          .eq("user_id", userData.id)
          .maybeSingle();

        if (!existing) {
          await supabase.from("client_profiles").insert({
            user_id: userData.id,
          });
        }
      } else if (role === "vendor") {
        const { data: existing } = await supabase
          .from("vendor_profiles")
          .select("id")
          .eq("user_id", userData.id)
          .maybeSingle();

        if (!existing) {
          const seed = await buildVendorProfileSeed(supabase, {
            businessName: displayName,
            userId: userData.id,
          });

          await supabase.from("vendor_profiles").insert({
            user_id: userData.id,
            ...seed,
          });
        }
      }
    }

    if (event.type === "user.deleted") {
      // Soft-delete or actual delete — for now, delete the user record.
      // Profiles remain for data integrity (bookings, reviews, etc.)
      await supabase.from("users").delete().eq("id", userData.id);
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return new Response("Internal error", { status: 500 });
  }
}
