import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  getAuthSession,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";
import type { Database } from "@/types/database.types";

type VendorProfileUpdate =
  Database["public"]["Tables"]["vendor_profiles"]["Update"];

async function guard() {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return { error: session };
  const roleCheck = requireRole(session, "admin", "manager");
  if (roleCheck) return { error: roleCheck };
  return { error: null };
}

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { error: guardErr } = await guard();
  if (guardErr) return guardErr;
  const { id } = await ctx.params;
  if (!id) return apiError("Invalid id", 400);

  try {
    const supabase = createAdminSupabaseClient();
    const [{ data: vendor, error }, { data: services }] = await Promise.all([
      supabase
        .from("vendor_profiles")
        .select(
          "id, business_name, slug, city, description, rating, is_verified, is_featured, category_id"
        )
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("vendor_services")
        .select("id, name, description, base_price, max_price, unit")
        .eq("vendor_profile_id", id)
        .order("name", { ascending: true }),
    ]);

    if (error) {
      console.error("vendor get:", error);
      return apiError("Failed to load vendor", 500);
    }
    if (!vendor) return apiError("Vendor not found", 404);

    return apiSuccess({
      vendor: {
        id: vendor.id,
        businessName: vendor.business_name,
        slug: vendor.slug,
        city: vendor.city,
        description: vendor.description,
        isVerified: Boolean(vendor.is_verified),
        isFeatured: Boolean(vendor.is_featured),
        categoryId: vendor.category_id ?? null,
      },
      services: (services ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        basePrice: s.base_price ?? null,
        maxPrice: s.max_price ?? null,
        unit: s.unit ?? null,
      })),
    });
  } catch (e) {
    console.error("GET /api/admin/vendors/[id]", e);
    return apiError("Internal server error", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { error: guardErr } = await guard();
  if (guardErr) return guardErr;
  const { id } = await ctx.params;
  if (!id) return apiError("Invalid id", 400);

  try {
    const supabase = createAdminSupabaseClient();
    const body = (await request.json()) as Record<string, unknown>;

    const updates: VendorProfileUpdate = {};
    if (typeof body.businessName === "string" && body.businessName.trim())
      updates.business_name = body.businessName.trim();
    if (body.city !== undefined)
      updates.city = typeof body.city === "string" ? body.city.trim() || null : null;
    if (body.description !== undefined)
      updates.description =
        typeof body.description === "string" ? body.description.trim() || null : null;
    if (body.categoryId !== undefined)
      updates.category_id = typeof body.categoryId === "string" ? body.categoryId : null;
    if (typeof body.isVerified === "boolean") updates.is_verified = body.isVerified;
    if (typeof body.isFeatured === "boolean") updates.is_featured = body.isFeatured;

    if (Object.keys(updates).length === 0) return apiError("Nothing to update", 400);

    const { data: row, error } = await supabase
      .from("vendor_profiles")
      .update(updates)
      .eq("id", id)
      .select("id, business_name, city, description, category_id, is_verified, is_featured")
      .single();

    if (error) {
      console.error("vendor update:", error);
      return apiError("Failed to update vendor", 500);
    }

    return apiSuccess({ vendor: row });
  } catch (e) {
    console.error("PATCH /api/admin/vendors/[id]", e);
    return apiError("Internal server error", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { error: guardErr } = await guard();
  if (guardErr) return guardErr;
  const { id } = await ctx.params;
  if (!id) return apiError("Invalid id", 400);

  try {
    const supabase = createAdminSupabaseClient();
    // Block delete if the vendor is referenced by any booking (keeps history intact).
    const { count } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("vendor_profile_id", id);
    if ((count ?? 0) > 0) {
      return apiError("This vendor has bookings and can't be deleted", 409);
    }

    await supabase.from("vendor_services").delete().eq("vendor_profile_id", id);
    const { error } = await supabase.from("vendor_profiles").delete().eq("id", id);
    if (error) {
      console.error("vendor delete:", error);
      return apiError("Failed to delete vendor", 500);
    }
    return apiSuccess({ message: "Vendor deleted" });
  } catch (e) {
    console.error("DELETE /api/admin/vendors/[id]", e);
    return apiError("Internal server error", 500);
  }
}
