import { NextRequest, NextResponse } from "next/server";
import { getClientWeddingContext, ensureWeddingDays } from "@/lib/wedding-plan.server";
import {
  apiError,
  apiSuccess,
  getAuthSession,
  requireRole,
} from "@/lib/api-utils";

function toOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "client");
  if (roleCheck) return roleCheck;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { supabase, wedding } = await getClientWeddingContext(session.userId);
    if (!wedding) {
      return apiError("Wedding not found", 404);
    }

    const { data: existingEvents, error: eventsError } = await supabase
      .from("wedding_events")
      .select("id, date, wedding_day_id")
      .eq("wedding_id", wedding.id);

    if (eventsError) {
      console.error("wedding_events load:", eventsError);
      return apiError("Failed to load wedding plan", 500);
    }

    const existingDays = await ensureWeddingDays(
      supabase,
      { id: wedding.id, date: wedding.date },
      existingEvents ?? []
    );

    const lastDay = existingDays[existingDays.length - 1] ?? null;
    const baseDate = lastDay?.date ?? wedding.date;
    const nextDate =
      baseDate && !Number.isNaN(new Date(baseDate).getTime())
        ? new Date(new Date(baseDate).getTime() + 24 * 60 * 60 * 1000).toISOString()
        : null;

    const { data: day, error } = await supabase
      .from("wedding_days")
      .insert({
        wedding_id: wedding.id,
        name: toOptionalString(body.name) ?? `Day ${existingDays.length + 1}`,
        date:
          typeof body.date === "string" && body.date
            ? new Date(body.date).toISOString()
            : nextDate,
        notes: toOptionalString(body.notes),
        sort_order: existingDays.length,
      })
      .select("id, name, date, notes, sort_order")
      .single();

    if (error) {
      console.error("wedding_days insert:", error);
      return apiError("Failed to add day", 500);
    }

    return apiSuccess({ day }, 201);
  } catch (error) {
    console.error("POST /api/wedding/days", error);
    return apiError("Internal server error", 500);
  }
}
