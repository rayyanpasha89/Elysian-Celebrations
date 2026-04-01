import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  getAuthSession,
  requireRole,
} from "@/lib/api-utils";
import { removeSavedVendorSlug } from "@/lib/saved-vendors";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;

  const roleCheck = requireRole(session, "client");
  if (roleCheck) return roleCheck;

  try {
    const { slug } = await params;
    const normalizedSlug = slug.trim().toLowerCase();

    if (!normalizedSlug) {
      return apiError("Vendor slug is required");
    }

    const supabase = createAdminSupabaseClient();
    const { data: vendor, error: vendorErr } = await supabase
      .from("vendor_profiles")
      .select("id, slug")
      .eq("slug", normalizedSlug)
      .maybeSingle();

    if (vendorErr) {
      console.error("Vendor lookup error:", vendorErr);
      return apiError("Failed to remove saved vendor", 500);
    }
    if (!vendor?.id || !vendor.slug) {
      return apiError("Vendor not found", 404);
    }

    const savedSlugs = await removeSavedVendorSlug(session.userId, vendor.slug);

    return apiSuccess({
      saved: false,
      slug: vendor.slug,
      savedSlugs,
    });
  } catch (error) {
    console.error("Saved vendors delete error:", error);
    return apiError("Internal server error", 500);
  }
}
