import { NextRequest } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient();
    const { searchParams } = request.nextUrl;
    const category = searchParams.get("category");
    const destination = searchParams.get("destination");
    const search = searchParams.get("q");
    const featured = searchParams.get("featured");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const offset = (page - 1) * limit;

    let query = supabase
      .from("vendor_profiles")
      .select(
        `*, category:vendor_categories(name, slug), services:vendor_services(name, base_price)`,
        { count: "exact" }
      )
      .order("is_featured", { ascending: false })
      .order("rating", { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) {
      query = query.eq("category.slug", category);
    }

    if (search) {
      query = query.or(
        `business_name.ilike.%${search}%,short_bio.ilike.%${search}%,city.ilike.%${search}%`
      );
    }

    if (featured === "true") {
      query = query.eq("is_featured", true);
    }

    const { data: vendors, count, error } = await query;

    if (error) {
      console.error("Vendors list error:", error);
      return apiError("Failed to fetch vendors", 500);
    }

    return apiSuccess({
      vendors: vendors ?? [],
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    });
  } catch (error) {
    console.error("Vendors list error:", error);
    return apiError("Internal server error", 500);
  }
}
