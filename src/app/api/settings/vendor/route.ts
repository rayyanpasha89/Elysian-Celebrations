import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  getAuthSession,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";
import type { Database } from "@/types/database.types";

type UserUpdate = Database["public"]["Tables"]["users"]["Update"];
type VendorProfileUpdate =
  Database["public"]["Tables"]["vendor_profiles"]["Update"];

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
      .select(
        "id, business_name, city, state, country, tax_id, accepting_inquiries"
      )
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
            taxId: vp.tax_id ?? "",
            acceptingInquiries: vp.accepting_inquiries,
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
    const parsedBody: unknown = await request.json();
    if (
      !parsedBody ||
      typeof parsedBody !== "object" ||
      Array.isArray(parsedBody)
    ) {
      return apiError("Settings payload must be an object", 400);
    }
    const body = parsedBody as {
      phone?: string;
      businessName?: string;
      city?: string;
      state?: string;
      country?: string;
      taxId?: string;
      acceptingInquiries?: boolean;
    };

    if (body.phone !== undefined && typeof body.phone !== "string") {
      return apiError("Phone must be text", 400);
    }
    if (typeof body.phone === "string" && body.phone.trim().length > 40) {
      return apiError("Phone must be 40 characters or fewer", 400);
    }
    if (body.businessName !== undefined) {
      if (typeof body.businessName !== "string" || !body.businessName.trim()) {
        return apiError("Business name is required", 400);
      }
      if (body.businessName.trim().length > 120) {
        return apiError("Business name must be 120 characters or fewer", 400);
      }
    }
    for (const [label, value] of [
      ["City", body.city],
      ["State", body.state],
      ["Country", body.country],
    ] as const) {
      if (value !== undefined && typeof value !== "string") {
        return apiError(`${label} must be text`, 400);
      }
      if (typeof value === "string" && value.trim().length > 100) {
        return apiError(`${label} must be 100 characters or fewer`, 400);
      }
    }
    if (
      body.country !== undefined &&
      typeof body.country === "string" &&
      !body.country.trim()
    ) {
      return apiError("Country is required", 400);
    }

    let normalizedTaxId: string | null | undefined;
    if (body.taxId !== undefined) {
      if (typeof body.taxId !== "string") {
        return apiError("GST / tax ID must be text", 400);
      }
      const taxId = body.taxId.trim().toUpperCase();
      if (taxId.length > 64) {
        return apiError("GST / tax ID must be 64 characters or fewer", 400);
      }
      if (taxId && !/^[A-Z0-9 .:/_-]+$/.test(taxId)) {
        return apiError("GST / tax ID contains unsupported characters", 400);
      }
      normalizedTaxId = taxId || null;
    }
    if (
      body.acceptingInquiries !== undefined &&
      typeof body.acceptingInquiries !== "boolean"
    ) {
      return apiError("Inquiry availability must be true or false", 400);
    }

    if (body.phone !== undefined) {
      const phone =
        body.phone.trim()
          ? body.phone.trim()
          : null;
      const userUpdate: UserUpdate = { phone };
      const { error } = await supabase
        .from("users")
        .update(userUpdate)
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

    const vpUpdates: VendorProfileUpdate = {};
    if (typeof body.businessName === "string" && body.businessName.trim()) {
      vpUpdates.business_name = body.businessName.trim();
    }
    if (typeof body.city === "string") vpUpdates.city = body.city.trim() || null;
    if (typeof body.state === "string") vpUpdates.state = body.state.trim() || null;
    if (typeof body.country === "string" && body.country.trim()) {
      vpUpdates.country = body.country.trim();
    }
    if (normalizedTaxId !== undefined) {
      vpUpdates.tax_id = normalizedTaxId;
    }
    if (body.acceptingInquiries !== undefined) {
      vpUpdates.accepting_inquiries = body.acceptingInquiries;
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
