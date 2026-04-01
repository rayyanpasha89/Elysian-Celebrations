import { NextRequest, NextResponse } from "next/server";
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
  const roleCheck = requireRole(session, "client");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();

    const { data: userRow, error: uErr } = await supabase
      .from("users")
      .select("name, email, phone")
      .eq("id", session.userId)
      .maybeSingle();
    if (uErr) {
      console.error("users:", uErr);
      return apiError("Failed to load account", 500);
    }

    const { data: cp } = await supabase
      .from("client_profiles")
      .select("id, partner_name, wedding_date, guest_count")
      .eq("user_id", session.userId)
      .maybeSingle();

    let wedding: {
      id: string;
      date: string | null;
      destinationId: string | null;
      destinationName: string | null;
    } | null = null;

    if (cp?.id) {
      const { data: w } = await supabase
        .from("weddings")
        .select(
          "id, date, destination_id, destination:destinations(id, name)"
        )
        .eq("client_profile_id", cp.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (w) {
        const dest = w.destination as { id?: string; name?: string } | null;
        wedding = {
          id: w.id,
          date: w.date,
          destinationId: w.destination_id ?? null,
          destinationName: dest?.name ?? null,
        };
      }
    }

    const { data: destRows } = await supabase
      .from("destinations")
      .select("id, name, country, slug")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    return apiSuccess({
      user: {
        name: userRow?.name ?? "",
        email: userRow?.email ?? "",
        phone: userRow?.phone ?? "",
      },
      clientProfile: cp
        ? {
            partnerName: cp.partner_name ?? "",
            weddingDate: cp.wedding_date,
            guestCount: cp.guest_count,
          }
        : null,
      wedding,
      destinationOptions: destRows ?? [],
    });
  } catch (e) {
    console.error("GET /api/settings/client", e);
    return apiError("Internal server error", 500);
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "client");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();
    const body = (await request.json()) as {
      name?: string;
      phone?: string;
      partnerName?: string;
      weddingDate?: string | null;
      guestCount?: number | null;
      destinationId?: string | null;
    };

    const { data: userRow, error: uErr } = await supabase
      .from("users")
      .select("id")
      .eq("id", session.userId)
      .maybeSingle();
    if (uErr || !userRow) {
      return apiError("Account not found", 404);
    }

    if (typeof body.name === "string" && body.name.trim()) {
      const { error } = await supabase
        .from("users")
        .update({ name: body.name.trim() })
        .eq("id", session.userId);
      if (error) {
        console.error("users update:", error);
        return apiError("Failed to update name", 500);
      }
    }

    if (body.phone !== undefined) {
      const phone =
        typeof body.phone === "string" && body.phone.trim()
          ? body.phone.trim()
          : null;
      const { error } = await supabase
        .from("users")
        .update({ phone })
        .eq("id", session.userId);
      if (error) {
        console.error("users phone:", error);
        return apiError("Failed to update phone", 500);
      }
    }

    const { data: cp } = await supabase
      .from("client_profiles")
      .select("id")
      .eq("user_id", session.userId)
      .maybeSingle();

    if (!cp) {
      if (
        body.partnerName !== undefined ||
        body.weddingDate !== undefined ||
        body.guestCount !== undefined ||
        body.destinationId !== undefined
      ) {
        return apiError(
          "Complete onboarding first to save wedding details.",
          400
        );
      }
      return apiSuccess({ ok: true });
    }

    const cpUpdates: Record<string, unknown> = {};
    if (typeof body.partnerName === "string") {
      cpUpdates.partner_name = body.partnerName.trim() || null;
    }
    if (body.weddingDate !== undefined) {
      cpUpdates.wedding_date = body.weddingDate
        ? new Date(body.weddingDate).toISOString()
        : null;
    }
    if (body.guestCount !== undefined) {
      if (body.guestCount === null) {
        cpUpdates.guest_count = null;
      } else {
        cpUpdates.guest_count = Math.max(0, Math.floor(Number(body.guestCount)));
      }
    }

    if (Object.keys(cpUpdates).length) {
      const { error } = await supabase
        .from("client_profiles")
        .update(cpUpdates)
        .eq("id", cp.id);
      if (error) {
        console.error("client_profiles update:", error);
        return apiError("Failed to update profile", 500);
      }
    }

    const { data: wedding } = await supabase
      .from("weddings")
      .select("id")
      .eq("client_profile_id", cp.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (wedding?.id) {
      const weddingUpdates: Record<string, unknown> = {};
      if (body.weddingDate !== undefined) {
        weddingUpdates.date = body.weddingDate
          ? new Date(body.weddingDate).toISOString()
          : null;
      }
      if (body.destinationId !== undefined) {
        weddingUpdates.destination_id =
          typeof body.destinationId === "string" && body.destinationId.trim()
            ? body.destinationId.trim()
            : null;
      }
      if (Object.keys(weddingUpdates).length) {
        const { error } = await supabase
          .from("weddings")
          .update(weddingUpdates)
          .eq("id", wedding.id);
        if (error) {
          console.error("weddings update:", error);
          return apiError("Failed to update wedding", 500);
        }
      }
    }

    return apiSuccess({ ok: true });
  } catch (e) {
    console.error("PATCH /api/settings/client", e);
    return apiError("Internal server error", 500);
  }
}
