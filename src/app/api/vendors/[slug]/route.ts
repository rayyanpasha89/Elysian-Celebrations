import { NextRequest } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
} from "@/lib/api-utils";

type SelectedReview = {
  id: string;
  rating: number;
  title: string | null;
  content: string | null;
  is_published: boolean;
  created_at: string;
};

const PUBLIC_VENDOR_DETAIL_COLUMNS =
  "id, business_name, slug, category_id, description, short_bio, cover_image, portfolio, city, state, country, experience, is_verified, is_featured, rating, review_count, created_at, updated_at";

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
        `${PUBLIC_VENDOR_DETAIL_COLUMNS}, category:vendor_categories(name, slug), services:vendor_services!inner(id, name, description, service_scope, base_price, max_price, unit, event_type_fit, inclusions, deliverables, add_ons, is_active, items:vendor_service_items(id, item_type, name, description, dietary_tags, image_urls, reference_url, sort_order)), reviews(id, rating, title, content, is_published, created_at)`
      )
      .eq("slug", slug)
      .eq("is_verified", true)
      .eq("accepting_inquiries", true)
      .eq("services.is_active", true)
      .eq("reviews.is_published", true)
      .single();

    if (error || !vendor) {
      return apiError("Vendor not found", 404);
    }

    const publicVendor = { ...vendor, reviews: undefined };

    return apiSuccess({
      ...publicVendor,
      reviews: toPublicReviews(vendor.reviews),
    });
  } catch (error) {
    console.error("Vendor detail error:", error);
    return apiError("Internal server error", 500);
  }
}
