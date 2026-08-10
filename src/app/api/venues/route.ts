import { NextRequest } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api-utils";
import { enforceRateLimit } from "@/lib/rate-limit";

/** PostgREST `ilike` wildcards — strip so user input cannot broaden the match. */
function sanitizeSearchQuery(raw: string): string {
  return raw.trim().replace(/[%_]/g, "").slice(0, 80);
}

export async function GET(request: NextRequest) {
  const limited = await enforceRateLimit(request, {
    scope: "venue-catalogue-read",
    limit: 120,
    windowSeconds: 60,
  });
  if (limited) return limited;

  try {
    const supabase = createAdminSupabaseClient();
    const { searchParams } = request.nextUrl;
    const destinationSlug = searchParams.get("destination")?.trim();
    const search = sanitizeSearchQuery(searchParams.get("q") ?? "");
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get("limit") || "12", 10) || 12),
      30
    );

    let destinationId: string | null = null;
    if (destinationSlug) {
      const { data: destination, error: destinationError } = await supabase
        .from("destinations")
        .select("id")
        .eq("slug", destinationSlug)
        .eq("is_active", true)
        .maybeSingle();

      if (destinationError) {
        console.error("Venue destination lookup error:", destinationError);
        return apiError("Failed to filter venues by destination", 500);
      }

      if (!destination?.id) {
        return apiSuccess({ venues: [] });
      }

      destinationId = destination.id;
    }

    let query = supabase
      .from("venues")
      .select(
        "id, name, slug, description, address, capacity, price_range, hero_image, amenities, destination:destinations(name, slug, country)"
      )
      .eq("is_active", true)
      .order("name", { ascending: true })
      .limit(limit);

    if (destinationId) {
      query = query.eq("destination_id", destinationId);
    }

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,description.ilike.%${search}%,address.ilike.%${search}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("Venues list error:", error);
      return apiError("Failed to fetch venues", 500);
    }

    return apiSuccess({ venues: data ?? [] });
  } catch (error) {
    console.error("Venues list error:", error);
    return apiError("Internal server error", 500);
  }
}
