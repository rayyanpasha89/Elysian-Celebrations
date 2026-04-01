import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  getAuthSession,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";

export async function GET() {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "client");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();

    const { data: profile, error: pErr } = await supabase
        .from("client_profiles")
        .select("id")
        .eq("user_id", session.userId)
        .maybeSingle();
      if (pErr) {
        console.error("client_profiles:", pErr);
        return apiError("Failed to load profile", 500);
      }
      if (!profile) {
        return apiSuccess({ wedding: null, events: [] });
      }

      const { data: wedding } = await supabase
        .from("weddings")
        .select(
          `id, name, date, status,
          destination:destinations(id, name, country, tagline, hero_image),
          package_tier:package_tiers(name, slug)`
        )
        .eq("client_profile_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!wedding) {
        return apiSuccess({ wedding: null, events: [] });
      }

      const { data: events } = await supabase
        .from("wedding_events")
        .select("id, name, date, venue, notes, sort_order")
        .eq("wedding_id", wedding.id)
        .order("sort_order", { ascending: true });

    return apiSuccess({ wedding, events: events ?? [] });
  } catch (e) {
    console.error("GET /api/wedding", e);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "client");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();
    const body = await request.json();
    const {
      coupleName,
      weddingDate,
      guestCount,
      destinationId,
      budgetTotal,
      partnerName,
    } = body as Record<string, unknown>;

    const name =
      typeof coupleName === "string" && coupleName.trim()
        ? coupleName.trim()
        : typeof partnerName === "string" && partnerName.trim()
          ? partnerName.trim()
          : "Our Wedding";

    const dateIso =
      typeof weddingDate === "string" && weddingDate
        ? new Date(weddingDate).toISOString()
        : null;

    const guests =
      typeof guestCount === "number" && guestCount > 0
        ? Math.floor(guestCount)
        : null;

    const destId =
      typeof destinationId === "string" && destinationId
        ? destinationId
        : null;

    const budget =
      typeof budgetTotal === "number" && budgetTotal > 0
        ? Math.floor(budgetTotal)
        : 500000;

    const { data: existingProfile, error: pErr } = await supabase
      .from("client_profiles")
      .select("id")
      .eq("user_id", session.userId)
      .maybeSingle();

    if (pErr) {
      console.error("client_profiles:", pErr);
      return apiError("Failed to load profile", 500);
    }

    let profile = existingProfile;

    if (!profile) {
      const { data: inserted, error: insErr } = await supabase
        .from("client_profiles")
        .insert({
          user_id: session.userId,
          partner_name:
            typeof partnerName === "string" ? partnerName : name,
          wedding_date: dateIso,
          guest_count: guests,
        })
        .select("id")
        .single();

      if (insErr || !inserted) {
        console.error("client_profiles insert:", insErr);
        return apiError("Failed to create client profile", 500);
      }
      profile = inserted;
    } else {
      await supabase
        .from("client_profiles")
        .update({
          partner_name:
            typeof partnerName === "string" ? partnerName : name,
          wedding_date: dateIso,
          ...(guests != null ? { guest_count: guests } : {}),
        })
        .eq("id", profile.id);
    }

    const { data: existingWedding } = await supabase
      .from("weddings")
      .select("id")
      .eq("client_profile_id", profile!.id)
      .maybeSingle();

    if (existingWedding) {
      return apiError("Wedding already exists", 409);
    }

    const { data: wedding, error: wErr } = await supabase
      .from("weddings")
      .insert({
        client_profile_id: profile!.id,
        name,
        date: dateIso,
        destination_id: destId,
        status: "PLANNING",
      })
      .select("id")
      .single();

    if (wErr || !wedding) {
      console.error("weddings insert:", wErr);
      return apiError("Failed to create wedding", 500);
    }

    const { error: bErr } = await supabase.from("budgets").insert({
      client_profile_id: profile!.id,
      name: "My Wedding Budget",
      total_budget: budget,
    });

    if (bErr) {
      console.error("budgets insert:", bErr);
    }

    const { error: glErr } = await supabase.from("guest_lists").insert({
      client_profile_id: profile!.id,
      name: "Main Guest List",
    });

    if (glErr) {
      console.error("guest_lists insert:", glErr);
    }

    return apiSuccess({ weddingId: wedding.id }, 201);
  } catch (e) {
    console.error("POST /api/wedding", e);
    return apiError("Internal server error", 500);
  }
}
