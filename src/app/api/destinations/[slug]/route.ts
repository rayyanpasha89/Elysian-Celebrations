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

    const { data: destination, error } = await supabase
      .from("destinations")
      .select(`*, venues(*)`)
      .eq("slug", slug)
      .single();

    if (error || !destination) {
      return apiError("Destination not found", 404);
    }

    return apiSuccess(destination);
  } catch (error) {
    console.error("Destination detail error:", error);
    return apiError("Internal server error", 500);
  }
}
