import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { getAuthSession, requireRole, apiError, apiSuccess } from "@/lib/api-utils";

export async function GET() {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "admin");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();
    const { data: rows, error } = await supabase
      .from("venues")
      .select("id, name, slug, address, capacity, price_range, is_active, destination:destinations(name)")
      .order("name", { ascending: true });

    if (error) {
      console.error("venues:", error);
      return apiError("Failed to load venues", 500);
    }

    const venues = (rows ?? []).map((v) => ({
      id: v.id,
      name: v.name,
      slug: v.slug,
      address: v.address,
      capacity: v.capacity,
      priceRange: v.price_range,
      isActive: v.is_active,
      destination: (v.destination as { name?: string } | null)?.name ?? "—",
    }));

    return apiSuccess({ venues });
  } catch (e) {
    console.error("GET /api/admin/venues", e);
    return apiError("Internal server error", 500);
  }
}
