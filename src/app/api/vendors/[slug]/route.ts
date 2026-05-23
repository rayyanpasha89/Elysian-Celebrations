import { NextRequest } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  getOptionalAuthSession,
} from "@/lib/api-utils";

async function recordVendorProfileView({
  supabase,
  vendorId,
  ownerUserId,
}: {
  supabase: ReturnType<typeof createAdminSupabaseClient>;
  vendorId: string;
  ownerUserId: string | null;
}) {
  try {
    const session = await getOptionalAuthSession();
    const viewerUserId = session?.userId ?? null;

    if (viewerUserId && viewerUserId === ownerUserId) {
      return;
    }

    if (viewerUserId) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: recent } = await supabase
        .from("vendor_profile_views")
        .select("id")
        .eq("vendor_profile_id", vendorId)
        .eq("viewer_user_id", viewerUserId)
        .gte("created_at", oneHourAgo)
        .limit(1)
        .maybeSingle();

      if (recent) return;
    }

    const { error } = await supabase.from("vendor_profile_views").insert({
      vendor_profile_id: vendorId,
      viewer_user_id: viewerUserId,
    });

    if (error) {
      console.error("Vendor profile view insert failed:", error);
    }
  } catch (error) {
    console.error("Vendor profile view tracking failed:", error);
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const supabase = createAdminSupabaseClient();

    const { data: vendor, error } = await supabase
      .from("vendor_profiles")
      .select(
        `*, category:vendor_categories(name, slug), services:vendor_services(*, items:vendor_service_items(id, item_type, name, description, dietary_tags, image_urls, reference_url, sort_order)), reviews(*, client:client_profiles(user_id))`
      )
      .eq("slug", slug)
      .single();

    if (error || !vendor) {
      return apiError("Vendor not found", 404);
    }

    await recordVendorProfileView({
      supabase,
      vendorId: vendor.id,
      ownerUserId: vendor.user_id,
    });

    return apiSuccess(vendor);
  } catch (error) {
    console.error("Vendor detail error:", error);
    return apiError("Internal server error", 500);
  }
}
