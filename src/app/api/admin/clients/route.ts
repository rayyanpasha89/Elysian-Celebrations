import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  getAuthSession,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";

export async function GET() {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "admin", "manager");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();

    const { data: profiles, error } = await supabase
      .from("client_profiles")
      .select(
        `id, user_id, partner_name, wedding_date, guest_count,
         user:users(name, email),
         weddings(id, name, date, destination:destinations(name))`
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("client_profiles:", error);
      return apiError("Failed to load clients", 500);
    }

    const clients = (profiles ?? []).map((p) => {
      const u = p.user as { name?: string; email?: string } | null;
      const weddings = p.weddings as
        | { id: string; name: string; date: string | null; destination: { name?: string } | null }[]
        | null;
      const w = weddings?.[0] ?? null;
      const dest = w?.destination as { name?: string } | null;

      return {
        id: p.id,
        userId: p.user_id,
        name: u?.name ?? p.partner_name ?? "—",
        email: u?.email ?? "—",
        weddingName: w?.name ?? null,
        weddingDate: w?.date ?? p.wedding_date ?? null,
        destination: dest?.name ?? null,
        guestCount: p.guest_count ?? null,
      };
    });

    return apiSuccess({ clients });
  } catch (e) {
    console.error("GET /api/admin/clients", e);
    return apiError("Internal server error", 500);
  }
}
