import { NextRequest } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api-utils";

/** PostgREST `ilike` wildcards — strip so user input cannot broaden the match. */
function sanitizeSearchQuery(raw: string): string {
  return raw.trim().replace(/[%_]/g, "").slice(0, 80);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient();
    const { searchParams } = request.nextUrl;
    const category = searchParams.get("category");
    const destinationSlug = searchParams.get("destination");
    const searchRaw = searchParams.get("q");
    const featured = searchParams.get("featured");

    const page = Math.max(
      1,
      parseInt(searchParams.get("page") || "1", 10) || 1
    );
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20),
      50
    );
    const offset = (page - 1) * limit;

    let vendorIdsFilter: string[] | null = null;
    if (destinationSlug?.trim()) {
      const { data: dest, error: destErr } = await supabase
        .from("destinations")
        .select("id")
        .eq("slug", destinationSlug.trim())
        .maybeSingle();
      if (destErr) {
        console.error("Destination lookup error:", destErr);
        return apiError("Failed to filter by destination", 500);
      }
      if (!dest?.id) {
        return apiSuccess({
          vendors: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        });
      }
      const { data: links, error: linkErr } = await supabase
        .from("vendor_destinations")
        .select("vendor_profile_id")
        .eq("destination_id", dest.id);
      if (linkErr) {
        console.error("Vendor destinations error:", linkErr);
        return apiError("Failed to filter by destination", 500);
      }
      vendorIdsFilter = [...new Set((links ?? []).map((l) => l.vendor_profile_id))];
      if (vendorIdsFilter.length === 0) {
        return apiSuccess({
          vendors: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        });
      }
    }

    let query = supabase
      .from("vendor_profiles")
      .select(
        `*, category:vendor_categories(name, slug), services:vendor_services(name, base_price)`,
        { count: "exact" }
      )
      .order("is_featured", { ascending: false })
      .order("rating", { ascending: false });

    if (vendorIdsFilter) {
      query = query.in("id", vendorIdsFilter);
    }

    if (category) {
      query = query.eq("category.slug", category);
    }

    const search = searchRaw ? sanitizeSearchQuery(searchRaw) : "";
    if (search) {
      query = query.or(
        `business_name.ilike.%${search}%,short_bio.ilike.%${search}%,city.ilike.%${search}%`
      );
    }

    if (featured === "true") {
      query = query.eq("is_featured", true);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: vendors, count, error } = await query;

    if (error) {
      console.error("Vendors list error:", error);
      return apiError("Failed to fetch vendors", 500);
    }

    const total = count ?? 0;

    return apiSuccess({
      vendors: vendors ?? [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Vendors list error:", error);
    return apiError("Internal server error", 500);
  }
}
