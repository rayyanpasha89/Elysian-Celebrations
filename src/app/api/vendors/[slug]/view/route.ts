import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { apiError, apiSuccess, getOptionalAuthSession } from "@/lib/api-utils";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await getOptionalAuthSession();
    const limited = await enforceRateLimit(request, {
      scope: "vendor-profile-view",
      limit: 90,
      windowSeconds: 60,
      identity: session?.userId,
    });
    if (limited) return limited;

    const supabase = createAdminSupabaseClient();

    const { data: vendor, error: vendorError } = await supabase
      .from("vendor_profiles")
      .select("id, user_id")
      .eq("slug", slug)
      .eq("is_verified", true)
      .maybeSingle();

    if (vendorError) throw vendorError;
    if (!vendor) return apiError("Vendor not found", 404);
    if (session?.userId === vendor.user_id) return apiSuccess({ recorded: false });

    // Deduplicate per viewer per hour. Anonymous callers have no identity to
    // key on, so they collapse into one null-viewer bucket per vendor. That
    // under-counts logged-out traffic, but this is an unauthenticated POST
    // The API limiter bounds request volume; this window separately prevents
    // ordinary repeat visits from inflating the vendor-facing analytics count.
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const recentQuery = supabase
      .from("vendor_profile_views")
      .select("id")
      .eq("vendor_profile_id", vendor.id)
      .gte("created_at", oneHourAgo)
      .limit(1);

    const { data: recent, error: recentError } = await (session?.userId
      ? recentQuery.eq("viewer_user_id", session.userId)
      : recentQuery.is("viewer_user_id", null)
    ).maybeSingle();

    if (recentError) throw recentError;
    if (recent) return apiSuccess({ recorded: false });

    const { error: insertError } = await supabase
      .from("vendor_profile_views")
      .insert({
        vendor_profile_id: vendor.id,
        viewer_user_id: session?.userId ?? null,
      });

    if (insertError) throw insertError;
    return apiSuccess({ recorded: true }, 201);
  } catch (error) {
    console.error("Vendor profile view tracking failed:", error);
    return apiError("Profile view could not be recorded", 500);
  }
}
