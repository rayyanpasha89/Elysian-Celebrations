import { NextRequest } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api-utils";

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
        `*, category:vendor_categories(name, slug), services:vendor_services(*), reviews(*, client:client_profiles(user_id))`
      )
      .eq("slug", slug)
      .single();

    if (error || !vendor) {
      return apiError("Vendor not found", 404);
    }

    return apiSuccess(vendor);
  } catch (error) {
    console.error("Vendor detail error:", error);
    return apiError("Internal server error", 500);
  }
}
