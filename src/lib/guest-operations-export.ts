import type { createAdminSupabaseClient } from "@/lib/supabase/server";

type AdminClient = ReturnType<typeof createAdminSupabaseClient>;

type GuestManifestRow = {
  guestName: string;
  hostGroup: string;
  rsvp: string;
  invitation: string;
  priority: string;
  household: string;
  relationship: string;
  owner: string;
  travel: string[];
  stays: string[];
  transfers: string[];
  care: string[];
};

export type GuestOperationsManifest = {
  event: { id: string; name: string; date: string | null };
  rows: GuestManifestRow[];
};

const text = (value: string | null | undefined) => value?.trim() || "Pending";
const label = (value: string | null | undefined) => text(value).replaceAll("_", " ");

function instant(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function dateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export async function loadGuestOperationsManifest(
  supabase: AdminClient,
  weddingId: string,
  clientProfileId: string
): Promise<GuestOperationsManifest | null> {
  const { data: event, error: eventError } = await supabase
    .from("weddings")
    .select("id, name, date")
    .eq("id", weddingId)
    .eq("client_profile_id", clientProfileId)
    .maybeSingle();
  if (eventError) throw eventError;
  if (!event) return null;

  const { data: guestLists, error: listError } = await supabase
    .from("guest_lists")
    .select("id")
    .eq("client_profile_id", clientProfileId);
  if (listError) throw listError;
  const listIds = (guestLists ?? []).map((item) => item.id);
  if (listIds.length === 0) {
    return { event: { id: event.id, name: event.name, date: event.date }, rows: [] };
  }

  const [guestsResult, operationsResult, travelResult, staysResult, transfersResult, careResult] =
    await Promise.all([
      supabase
        .from("guests")
        .select("id, name, side, rsvp_status")
        .in("guest_list_id", listIds)
        .order("name"),
      supabase
        .from("event_guest_operations")
        .select("id, guest_id, household_name, relationship_group, invitation_status, vip_level, owner_label")
        .eq("wedding_id", weddingId),
      supabase
        .from("guest_travel_legs")
        .select("event_guest_operation_id, mode, provider, origin, destination, departure_at, arrival_at, status, sort_order")
        .eq("wedding_id", weddingId)
        .order("sort_order"),
      supabase
        .from("guest_stays")
        .select("event_guest_operation_id, hotel_name, room_type, room_number, check_in_date, check_out_date, status, key_status, luggage_status, sort_order")
        .eq("wedding_id", weddingId)
        .order("sort_order"),
      supabase
        .from("guest_transfers")
        .select("event_guest_operation_id, vehicle_label, route_label, pickup_at, pickup_location, drop_location, seat_label, status, sort_order")
        .eq("wedding_id", weddingId)
        .order("sort_order"),
      supabase
        .from("guest_hospitality_items")
        .select("event_guest_operation_id, item_type, title, status, owner_label, due_at, sort_order")
        .eq("wedding_id", weddingId)
        .order("sort_order"),
    ]);

  for (const result of [
    guestsResult,
    operationsResult,
    travelResult,
    staysResult,
    transfersResult,
    careResult,
  ]) {
    if (result.error) throw result.error;
  }

  const operationsByGuest = new Map(
    (operationsResult.data ?? []).map((operation) => [operation.guest_id, operation])
  );

  const rows = (guestsResult.data ?? []).map((guest): GuestManifestRow => {
    const operation = operationsByGuest.get(guest.id);
    const operationId = operation?.id;
    return {
      guestName: guest.name,
      hostGroup: label(guest.side),
      rsvp: label(guest.rsvp_status),
      invitation: label(operation?.invitation_status),
      priority: label(operation?.vip_level),
      household: text(operation?.household_name),
      relationship: text(operation?.relationship_group),
      owner: text(operation?.owner_label),
      travel: (travelResult.data ?? [])
        .filter((item) => item.event_guest_operation_id === operationId)
        .map(
          (item) =>
            `${label(item.mode)} · ${item.origin} to ${item.destination} · ${instant(item.departure_at)} to ${instant(item.arrival_at)} · ${label(item.status)} · ${text(item.provider)}`
        ),
      stays: (staysResult.data ?? [])
        .filter((item) => item.event_guest_operation_id === operationId)
        .map(
          (item) =>
            `${item.hotel_name} · ${text(item.room_type)} / ${text(item.room_number)} · ${dateOnly(item.check_in_date)} to ${dateOnly(item.check_out_date)} · ${label(item.status)} · key ${label(item.key_status)} · luggage ${label(item.luggage_status)}`
        ),
      transfers: (transfersResult.data ?? [])
        .filter((item) => item.event_guest_operation_id === operationId)
        .map(
          (item) =>
            `${item.route_label} · ${instant(item.pickup_at)} · ${item.pickup_location} to ${item.drop_location} · ${text(item.vehicle_label)} / ${text(item.seat_label)} · ${label(item.status)}`
        ),
      care: (careResult.data ?? [])
        .filter((item) => item.event_guest_operation_id === operationId)
        .map(
          (item) =>
            `${label(item.item_type)} · ${item.title} · ${label(item.status)} · ${text(item.owner_label)}${item.due_at ? ` · ${instant(item.due_at)}` : ""}`
        ),
    };
  });

  return {
    event: { id: event.id, name: event.name, date: event.date },
    rows,
  };
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export function guestOperationsManifestCsv(manifest: GuestOperationsManifest) {
  const columns = [
    "Guest",
    "Host group",
    "RSVP",
    "Invitation",
    "Priority",
    "Household",
    "Relationship",
    "Hospitality owner",
    "Travel",
    "Stay",
    "Transfers",
    "Care",
  ];
  const lines = manifest.rows.map((row) =>
    [
      row.guestName,
      row.hostGroup,
      row.rsvp,
      row.invitation,
      row.priority,
      row.household,
      row.relationship,
      row.owner,
      row.travel.join(" | "),
      row.stays.join(" | "),
      row.transfers.join(" | "),
      row.care.join(" | "),
    ]
      .map(csvCell)
      .join(",")
  );
  return `\uFEFF${[columns.map(csvCell).join(","), ...lines].join("\r\n")}`;
}
