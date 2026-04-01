import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  getAuthSession,
  requireRole,
} from "@/lib/api-utils";
import { addSavedVendorSlug, getSavedVendorSlugs } from "@/lib/saved-vendors";

export async function GET() {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;

  const roleCheck = requireRole(session, "client");
  if (roleCheck) return roleCheck;

  try {
    const savedSlugs = await getSavedVendorSlugs(session.userId);
    if (savedSlugs.length === 0) {
      return apiSuccess({ savedSlugs: [], savedVendors: [] });
    }

    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("vendor_profiles")
      .select("id, slug, business_name")
      .in("slug", savedSlugs);

    if (error) {
      console.error("Saved vendors load error:", error);
      return apiError("Failed to load saved vendors", 500);
    }

    const vendorBySlug = new Map(
      (data ?? []).map((row) => [
        row.slug as string,
        {
          id: row.id as string,
          slug: row.slug as string,
          business_name: row.business_name as string | undefined,
        },
      ])
    );

    const savedVendors = savedSlugs.reduce<
      { id: string; slug: string; business_name: string | undefined }[]
    >((accumulator, slug) => {
      const vendor = vendorBySlug.get(slug);
      if (vendor?.id && vendor.slug) {
        accumulator.push(vendor);
      }
      return accumulator;
    }, []);

    return apiSuccess({
      savedSlugs: savedVendors.map((vendor) => vendor.slug),
      savedVendors,
    });
  } catch (error) {
    console.error("Saved vendors load error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;

  const roleCheck = requireRole(session, "client");
  if (roleCheck) return roleCheck;

  try {
    const body = await request.json();
    const slug =
      typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";

    if (!slug) {
      return apiError("Vendor slug is required");
    }

    const supabase = createAdminSupabaseClient();
    const { data: vendor, error: vendorErr } = await supabase
      .from("vendor_profiles")
      .select("id, slug")
      .eq("slug", slug)
      .maybeSingle();

    if (vendorErr) {
      console.error("Vendor lookup error:", vendorErr);
      return apiError("Failed to save vendor", 500);
    }
    if (!vendor?.id || !vendor.slug) {
      return apiError("Vendor not found", 404);
    }

    const savedSlugs = await addSavedVendorSlug(session.userId, vendor.slug);

    return apiSuccess(
      { saved: true, slug: vendor.slug, savedSlugs },
      201
    );
  } catch (error) {
    console.error("Saved vendors create error:", error);
    return apiError("Internal server error", 500);
  }
}
