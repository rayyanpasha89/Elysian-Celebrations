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
  const roleCheck = requireRole(session, "vendor");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();

    const { data: userRow, error: uErr } = await supabase
      .from("users")
      .select("name, email, phone")
      .eq("id", session.userId)
      .maybeSingle();
    if (uErr) {
      console.error("users:", uErr);
      return apiError("Failed to load account", 500);
    }

    const { data: vp, error: vErr } = await supabase
      .from("vendor_profiles")
      .select("id, business_name, city, state, country")
      .eq("user_id", session.userId)
      .maybeSingle();
    if (vErr) {
      console.error("vendor_profiles:", vErr);
      return apiError("Failed to load vendor profile", 500);
    }

    return apiSuccess({
      user: {
        name: userRow?.name ?? "",
        email: userRow?.email ?? "",
        phone: userRow?.phone ?? "",
      },
      vendor: vp
        ? {
            businessName: vp.business_name,
            city: vp.city ?? "",
            state: vp.state ?? "",
            country: vp.country ?? "",
          }
        : null,
    });
  } catch (e) {
    console.error("GET /api/settings/vendor", e);
    return apiError("Internal server error", 500);
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "vendor");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();
    const body = (await request.json()) as {
      phone?: string;
      businessName?: string;
      city?: string;
      state?: string;
      country?: string;
    };

    if (body.phone !== undefined) {
      const phone =
        typeof body.phone === "string" && body.phone.trim()
          ? body.phone.trim()
          : null;
      const { error } = await supabase
        .from("users")
        .update({ phone })
        .eq("id", session.userId);
      if (error) {
        console.error("users phone:", error);
        return apiError("Failed to update phone", 500);
      }
    }

    const { data: vp, error: vErr } = await supabase
      .from("vendor_profiles")
      .select("id")
      .eq("user_id", session.userId)
      .maybeSingle();
    if (vErr) {
      console.error("vendor_profiles:", vErr);
      return apiError("Failed to load vendor profile", 500);
    }
    if (!vp) {
      return apiError("Vendor profile not found", 404);
    }

    const vpUpdates: Record<string, unknown> = {};
    if (typeof body.businessName === "string" && body.businessName.trim()) {
      vpUpdates.business_name = body.businessName.trim();
    }
    if (typeof body.city === "string") vpUpdates.city = body.city.trim() || null;
    if (typeof body.state === "string") vpUpdates.state = body.state.trim() || null;
    if (typeof body.country === "string" && body.country.trim()) {
      vpUpdates.country = body.country.trim();
    }

    if (Object.keys(vpUpdates).length) {
      const { error } = await supabase
        .from("vendor_profiles")
        .update(vpUpdates)
        .eq("id", vp.id);
      if (error) {
        console.error("vendor_profiles update:", error);
        return apiError("Failed to update business details", 500);
      }
    }

    return apiSuccess({ ok: true });
  } catch (e) {
    console.error("PATCH /api/settings/vendor", e);
    return apiError("Internal server error", 500);
  }
}
