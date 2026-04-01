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
    const { data: vp, error: vErr } = await supabase
      .from("vendor_profiles")
      .select("id")
      .eq("user_id", session.userId)
      .maybeSingle();
    if (vErr) {
      console.error("vendor_profiles:", vErr);
      return apiError("Failed to load vendor", 500);
    }
    if (!vp) {
      return apiSuccess({ services: [] });
    }

    const { data: services, error } = await supabase
      .from("vendor_services")
      .select("*")
      .eq("vendor_profile_id", vp.id)
      .order("name");

    if (error) {
      console.error("vendor_services:", error);
      return apiError("Failed to load services", 500);
    }

    return apiSuccess({ services: services ?? [] });
  } catch (e) {
    console.error("GET /api/vendor/services", e);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "vendor");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();
    const body = await request.json();
    const { name, description, basePrice, maxPrice, unit } = body as Record<
      string,
      unknown
    >;

    if (!name || typeof name !== "string") {
      return apiError("Name is required");
    }
    const price =
      typeof basePrice === "number" ? basePrice : Number(basePrice);
    if (!Number.isFinite(price) || price < 0) {
      return apiError("Valid base price is required");
    }

    const { data: vp, error: vErr } = await supabase
      .from("vendor_profiles")
      .select("id")
      .eq("user_id", session.userId)
      .maybeSingle();
    if (vErr || !vp) {
      return apiError("Vendor profile not found", 404);
    }

    const { data: row, error } = await supabase
      .from("vendor_services")
      .insert({
        vendor_profile_id: vp.id,
        name: name.trim(),
        description: typeof description === "string" ? description : null,
        base_price: Math.floor(price),
        max_price:
          typeof maxPrice === "number" && maxPrice > 0
            ? Math.floor(maxPrice)
            : null,
        unit: typeof unit === "string" ? unit : null,
      })
      .select()
      .single();

    if (error) {
      console.error("vendor_services insert:", error);
      return apiError("Failed to create service", 500);
    }

    return apiSuccess(row, 201);
  } catch (e) {
    console.error("POST /api/vendor/services", e);
    return apiError("Internal server error", 500);
  }
}
