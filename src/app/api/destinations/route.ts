import { NextRequest } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api-utils";

export async function GET(_request: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient();

    const { data: destinations, error } = await supabase
      .from("destinations")
      .select(`*, venues(id, name, slug, capacity, price_range)`)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Destinations list error:", error);
      return apiError("Failed to fetch destinations", 500);
    }

    return apiSuccess({ destinations: destinations ?? [] });
  } catch (error) {
    console.error("Destinations list error:", error);
    return apiError("Internal server error", 500);
  }
}
