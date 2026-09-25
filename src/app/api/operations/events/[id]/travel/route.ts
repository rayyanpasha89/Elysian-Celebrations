import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { apiError, apiSuccess, getAuthSession, requireRole } from "@/lib/api-utils";
import { isUuid } from "@/lib/id-utils";
import { resolveOperationsAccess } from "@/lib/operations-auth";
import { parsePartnerTravelDraft } from "@/lib/partner-travel";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database.types";

type Supabase = ReturnType<typeof createAdminSupabaseClient>;
type PartyRow = Database["public"]["Tables"]["event_partner_travel_parties"]["Row"];
type TravelLegRow = Database["public"]["Tables"]["event_partner_travel_legs"]["Row"];
type StayRow = Database["public"]["Tables"]["event_partner_stays"]["Row"];
type TransferRow = Database["public"]["Tables"]["event_partner_transfers"]["Row"];
type TravelSnapshot = {
  parties: PartyRow[];
  travelLegs: TravelLegRow[];
  stays: StayRow[];
  transfers: TransferRow[];
};

function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function conflict(error: { code?: string; message?: string }) {
  if (error.code === "23514" && error.message?.includes("Partner travel changed")) {
    return apiError("Partner travel changed. Reload and try again.", 409);
  }
  if (["23503", "23505", "23514"].includes(error.code ?? "")) {
    return apiError(
      "The selected booking, vendor, function, or travel sequence is outside this event",
      409,
    );
  }
  return null;
}

function serializeParty(
  party: PartyRow,
  travelLegs: TravelLegRow[],
  stays: StayRow[],
  transfers: TransferRow[],
  canViewFinancials: boolean,
) {
  const partyLegs = travelLegs
    .filter((item) => item.party_id === party.id)
    .sort((a, b) => a.sort_order - b.sort_order);
  const legIndex = new Map(partyLegs.map((item, index) => [item.id, index]));
  return {
    partyId: party.id,
    version: party.version,
    party: {
      bookingId: party.booking_id,
      vendorProfileId: party.vendor_profile_id,
      weddingEventId: party.wedding_event_id,
      partyType: party.party_type,
      name: party.name,
      company: party.company ?? "",
      departmentLabel: party.department_label ?? "",
      roleLabel: party.role_label ?? "",
      headCount: party.head_count,
      contactLabel: party.contact_label ?? "",
      foodPlan: party.food_plan ?? "",
      perDiemAmount: canViewFinancials ? party.per_diem_amount : null,
      ownerLabel: party.owner_label ?? "",
      notes: party.notes ?? "",
    },
    travelLegs: partyLegs.map((item) => ({
      id: item.id,
      mode: item.mode,
      provider: item.provider ?? "",
      referenceLabel: item.reference_label ?? "",
      origin: item.origin,
      destination: item.destination,
      departureAt: item.departure_at,
      arrivalAt: item.arrival_at,
      status: item.status,
      pickupRequired: item.pickup_required,
    })),
    stays: stays
      .filter((item) => item.party_id === party.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => ({
        id: item.id,
        hotelName: item.hotel_name,
        roomType: item.room_type ?? "",
        roomCount: item.room_count,
        checkInDate: item.check_in_date,
        checkOutDate: item.check_out_date,
        status: item.status,
        foodPlan: item.food_plan ?? "",
      })),
    transfers: transfers
      .filter((item) => item.party_id === party.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => ({
        id: item.id,
        travelLegIndex:
          item.travel_leg_id === null ? null : legIndex.get(item.travel_leg_id) ?? null,
        routeLabel: item.route_label,
        pickupAt: item.pickup_at,
        pickupLocation: item.pickup_location,
        dropLocation: item.drop_location,
        vehicleLabel: item.vehicle_label ?? "",
        status: item.status,
      })),
    updatedAt: party.updated_at,
  };
}

async function loadWorkspace(
  supabase: Supabase,
  weddingId: string,
  canViewFinancials: boolean,
) {
  const [functionsResult, snapshotResult] = await Promise.all([
      supabase
        .from("wedding_events")
        .select(
          "id, name, time_block, date, wedding_day:wedding_days!wedding_events_wedding_day_id_fkey(name, date)",
        )
        .eq("wedding_id", weddingId)
        .order("sort_order", { ascending: true }),
      supabase.rpc("load_event_partner_travel_snapshot", {
        p_wedding_id: weddingId,
      }),
    ]);
  if (functionsResult.error) throw functionsResult.error;
  if (snapshotResult.error) throw snapshotResult.error;

  const snapshot = snapshotResult.data as unknown as TravelSnapshot;

  const eventFunctions = functionsResult.data ?? [];
  const functionIds = eventFunctions.map((item) => item.id);
  const bookingsResult = functionIds.length
    ? await supabase
        .from("bookings")
        .select(
          "id, vendor_profile_id, wedding_event_id, status, vendor:vendor_profiles(id, business_name), service:vendor_services(name)",
        )
        .in("wedding_event_id", functionIds)
        .neq("status", "CANCELLED")
        .order("created_at", { ascending: true })
    : { data: [], error: null };
  if (bookingsResult.error) throw bookingsResult.error;

  return {
    parties: snapshot.parties.map((party) =>
      serializeParty(
        party,
        snapshot.travelLegs,
        snapshot.stays,
        snapshot.transfers,
        canViewFinancials,
      ),
    ),
    references: {
      functions: eventFunctions.map((item) => {
        const day = one(item.wedding_day);
        return {
          id: item.id,
          label: `${day?.name ?? "Event"} · ${item.name}`,
          date: item.date ?? day?.date ?? null,
          timeBlock: item.time_block,
        };
      }),
      bookings: (bookingsResult.data ?? []).map((item) => {
        const vendor = one(item.vendor);
        const service = one(item.service);
        return {
          id: item.id,
          vendorProfileId: item.vendor_profile_id,
          weddingEventId: item.wedding_event_id,
          status: item.status,
          label: `${vendor?.business_name ?? "Selected partner"} · ${service?.name ?? "Service"}`,
          vendorName: vendor?.business_name ?? "Selected partner",
          serviceName: service?.name ?? "Service",
        };
      }),
    },
    permissions: {
      canManage: false,
      canViewFinancials,
    },
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "manager", "admin");
  if (roleCheck) return roleCheck;
  const { id } = await params;
  if (!isUuid(id)) return apiError("Invalid event", 400);

  try {
    const access = await resolveOperationsAccess(session, id, "VIEW_EVENT");
    if (!access) return apiError("Event not found", 404);
    const workspace = await loadWorkspace(
      createAdminSupabaseClient(),
      id,
      access.permissions.includes("VIEW_FINANCIALS"),
    );
    workspace.permissions.canManage = access.permissions.includes("MANAGE_PRODUCTION");
    return apiSuccess(workspace);
  } catch (error) {
    console.error("GET /api/operations/events/[id]/travel:", error);
    return apiError("Partner travel could not be loaded", 500);
  }
}

async function save(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  expectedCreate: boolean,
) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "manager", "admin");
  if (roleCheck) return roleCheck;
  const { id } = await params;
  if (!isUuid(id)) return apiError("Invalid event", 400);

  const limited = await enforceRateLimit(request, {
    scope: "event-partner-travel-save",
    limit: 30,
    windowSeconds: 60,
    identity: session.userId,
  });
  if (limited) return limited;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }
  const parsed = parsePartnerTravelDraft(raw);
  if (!parsed.ok) return apiError(parsed.error, 400);
  if (expectedCreate !== (parsed.value.partyId === null)) {
    return apiError(expectedCreate ? "Create a new travel party" : "Choose a travel party to update", 400);
  }
  if (
    parsed.value.partyId === null &&
    parsed.value.party.vendorProfileId &&
    !parsed.value.party.bookingId
  ) {
    return apiError("Choose the selected booking for this partner", 400);
  }

  try {
    const access = await resolveOperationsAccess(session, id, "MANAGE_PRODUCTION");
    if (!access) return apiError("Event not found", 404);
    const canViewFinancials = access.permissions.includes("VIEW_FINANCIALS");
    if (!canViewFinancials && parsed.value.party.perDiemAmount !== null) {
      return apiError("Your event role cannot change financial travel details", 403);
    }

    const supabase = createAdminSupabaseClient();
    let preservedPerDiem: number | null = parsed.value.party.perDiemAmount;
    if (!canViewFinancials && parsed.value.partyId) {
      const { data, error } = await supabase
        .from("event_partner_travel_parties")
        .select("per_diem_amount")
        .eq("id", parsed.value.partyId)
        .eq("wedding_id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return apiError("Travel party not found", 404);
      preservedPerDiem = data.per_diem_amount;
    }

    const travelLegs = parsed.value.travelLegs.map((item) => ({
      ...item,
      id: item.id ?? randomUUID(),
    }));
    const stays = parsed.value.stays.map((item) => ({
      ...item,
      id: item.id ?? randomUUID(),
    }));
    const transfers = parsed.value.transfers.map((item) => ({
      ...item,
      id: item.id ?? randomUUID(),
      travelLegId:
        item.travelLegIndex === null
          ? null
          : travelLegs[item.travelLegIndex]?.id ?? null,
      travelLegIndex: undefined,
    }));
    const { data: partyId, error } = await supabase.rpc(
      "save_event_partner_travel_party",
      {
        p_wedding_id: id,
        p_party_id: parsed.value.partyId,
        p_expected_version: parsed.value.version,
        p_party: {
          ...parsed.value.party,
          perDiemAmount: preservedPerDiem,
        } as Json,
        p_travel_legs: travelLegs as Json,
        p_stays: stays as Json,
        p_transfers: transfers as Json,
        p_actor_user_id: session.userId,
      },
    );
    if (error) return conflict(error) ?? (() => { throw error; })();
    if (!partyId) throw new Error("Partner travel party ID was not returned");

    const workspace = await loadWorkspace(supabase, id, canViewFinancials);
    const party = workspace.parties.find((item) => item.partyId === partyId);
    if (!party) throw new Error("Saved partner travel party was not found");
    await supabase.from("admin_audit_log").insert({
      actor_user_id: session.userId,
      action: expectedCreate ? "PARTNER_TRAVEL_CREATED" : "PARTNER_TRAVEL_UPDATED",
      entity_type: "event_partner_travel_party",
      entity_id: partyId,
      summary: parsed.value.party.name,
      meta: { weddingId: id, version: party.version },
    });
    return apiSuccess({ party }, expectedCreate ? 201 : 200);
  } catch (error) {
    console.error("SAVE /api/operations/events/[id]/travel:", error);
    return apiError("Partner travel could not be saved", 500);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return save(request, context, true);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return save(request, context, false);
}
