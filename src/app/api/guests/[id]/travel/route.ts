import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { apiError, apiSuccess, getAuthSession, requireRole } from "@/lib/api-utils";
import {
  eventBelongsToClient,
  getClientProfileId,
  guestBelongsToClient,
} from "@/lib/guest-access";
import { parseGuestOperationsSnapshot } from "@/lib/guest-operations";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";

async function authorizeGuestEvent(userId: string, guestId: string, weddingId: string) {
  const supabase = createAdminSupabaseClient();
  const profileId = await getClientProfileId(supabase, userId);
  if (!profileId) return { error: apiError("Client profile not found", 404) };

  const [guestAllowed, eventAllowed] = await Promise.all([
    guestBelongsToClient(supabase, guestId, profileId),
    eventBelongsToClient(supabase, weddingId, profileId),
  ]);
  if (!guestAllowed) return { error: apiError("Guest not found", 404) };
  if (!eventAllowed) return { error: apiError("Event not found", 404) };
  return { supabase };
}

async function loadSnapshot(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  weddingId: string,
  guestId: string
) {
  const { data, error } = await supabase.rpc("load_guest_operations_snapshot", {
    p_wedding_id: weddingId,
    p_guest_id: guestId,
  });
  if (error) throw error;
  return data;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "client");
  if (roleCheck) return roleCheck;

  const { id: guestId } = await context.params;
  const weddingId = request.nextUrl.searchParams.get("weddingId")?.trim() ?? "";
  if (!weddingId) return apiError("Choose an event", 400);

  try {
    const authorization = await authorizeGuestEvent(session.userId, guestId, weddingId);
    if (authorization.error) return authorization.error;
    const snapshot = await loadSnapshot(authorization.supabase, weddingId, guestId);
    return apiSuccess({ snapshot });
  } catch (error) {
    console.error("Guest operations load error:", error);
    return apiError("Failed to load guest operations", 500);
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "client");
  if (roleCheck) return roleCheck;

  const { id: guestId } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const parsed = parseGuestOperationsSnapshot(body);
  if (!parsed.ok) return apiError(parsed.error, 400);

  try {
    const authorization = await authorizeGuestEvent(
      session.userId,
      guestId,
      parsed.value.weddingId
    );
    if (authorization.error) return authorization.error;

    const travelLegs = parsed.value.travelLegs.map((leg) => ({
      ...leg,
      id: leg.id ?? randomUUID(),
    }));
    const stays = parsed.value.stays.map((stay) => ({
      ...stay,
      id: stay.id ?? randomUUID(),
    }));
    const transfers = parsed.value.transfers.map((transfer) => ({
      ...transfer,
      id: transfer.id ?? randomUUID(),
      travelLegId:
        transfer.travelLegIndex === null
          ? null
          : travelLegs[transfer.travelLegIndex]?.id ?? null,
      travelLegIndex: undefined,
    }));
    const hospitalityItems = parsed.value.hospitalityItems.map((item) => ({
      ...item,
      id: item.id ?? randomUUID(),
    }));

    const { error } = await authorization.supabase.rpc("save_guest_operations_snapshot", {
      p_wedding_id: parsed.value.weddingId,
      p_guest_id: guestId,
      p_expected_version: parsed.value.version,
      p_profile: parsed.value.profile as Json,
      p_travel_legs: travelLegs as Json,
      p_stays: stays as Json,
      p_transfers: transfers as Json,
      p_hospitality_items: hospitalityItems as Json,
      p_actor_user_id: session.userId,
    });
    if (error) {
      if (
        error.code === "40001" ||
        (error.code === "23514" && error.message.includes("Guest operations changed"))
      ) {
        return apiError("Guest operations changed. Reload and try again.", 409);
      }
      throw error;
    }

    const snapshot = await loadSnapshot(
      authorization.supabase,
      parsed.value.weddingId,
      guestId
    );
    return apiSuccess({ snapshot });
  } catch (error) {
    console.error("Guest operations save error:", error);
    return apiError("Failed to save guest operations", 500);
  }
}
