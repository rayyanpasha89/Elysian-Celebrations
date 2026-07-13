import { NextRequest } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  getOptionalAuthSession,
} from "@/lib/api-utils";

type SelectedReview = {
  id: string;
  rating: number;
  title: string | null;
  content: string | null;
  is_published: boolean;
  created_at: string;
};

function toPublicReviews(reviews: unknown) {
  if (!Array.isArray(reviews)) return [];

  return (reviews as SelectedReview[])
    .filter((review) => review.is_published === true)
    .map(({ id, rating, title, content, created_at }) => ({
      id,
      rating,
      title,
      content,
      created_at,
    }));
}

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
        `*, category:vendor_categories(name, slug), services:vendor_services!inner(*, items:vendor_service_items(id, item_type, name, description, dietary_tags, image_urls, reference_url, sort_order)), reviews(id, rating, title, content, is_published, created_at)`
      )
      .eq("slug", slug)
      .eq("is_verified", true)
      .eq("services.is_active", true)
      .eq("reviews.is_published", true)
      .single();

    if (error || !vendor) {
      return apiError("Vendor not found", 404);
    }

    const { user_id: ownerUserId, reviews, ...publicVendor } = vendor;

    await recordVendorProfileView({
      supabase,
      vendorId: vendor.id,
      ownerUserId,
    });

    return apiSuccess({
      ...publicVendor,
      reviews: toPublicReviews(reviews),
    });
  } catch (error) {
    console.error("Vendor detail error:", error);
    return apiError("Internal server error", 500);
  }
}
