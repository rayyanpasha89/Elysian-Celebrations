import { isUuid } from "@/lib/id-utils";

export const PARTNER_PARTY_TYPES = [
  "VENDOR",
  "ARTIST",
  "CREW",
  "SPEAKER",
  "PERFORMER",
  "OTHER",
] as const;
export const PARTNER_TRAVEL_MODES = [
  "FLIGHT",
  "TRAIN",
  "CAR",
  "COACH",
  "BUS",
  "BOAT",
  "OTHER",
] as const;
export const PARTNER_TRAVEL_STATUSES = [
  "OPTION",
  "PLANNED",
  "BOOKED",
  "CHECKED_IN",
  "ARRIVED",
  "CANCELLED",
] as const;
export const PARTNER_STAY_STATUSES = [
  "PLANNED",
  "HELD",
  "ALLOCATED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "CANCELLED",
] as const;
export const PARTNER_TRANSFER_STATUSES = [
  "PLANNED",
  "ASSIGNED",
  "DISPATCHED",
  "PICKED_UP",
  "DROPPED",
  "NO_SHOW",
  "CANCELLED",
] as const;

export type PartnerPartyType = (typeof PARTNER_PARTY_TYPES)[number];
export type PartnerTravelMode = (typeof PARTNER_TRAVEL_MODES)[number];
export type PartnerTravelStatus = (typeof PARTNER_TRAVEL_STATUSES)[number];
export type PartnerStayStatus = (typeof PARTNER_STAY_STATUSES)[number];
export type PartnerTransferStatus = (typeof PARTNER_TRANSFER_STATUSES)[number];

export type PartnerTravelDraft = {
  partyId: string | null;
  version: number | null;
  party: {
    bookingId: string | null;
    vendorProfileId: string | null;
    weddingEventId: string | null;
    partyType: PartnerPartyType;
    name: string;
    company: string;
    departmentLabel: string;
    roleLabel: string;
    headCount: number;
    contactLabel: string;
    foodPlan: string;
    perDiemAmount: number | null;
    ownerLabel: string;
    notes: string;
  };
  travelLegs: Array<{
    id: string | null;
    mode: PartnerTravelMode;
    provider: string;
    referenceLabel: string;
    origin: string;
    destination: string;
    departureAt: string;
    arrivalAt: string;
    status: PartnerTravelStatus;
    pickupRequired: boolean;
  }>;
  stays: Array<{
    id: string | null;
    hotelName: string;
    roomType: string;
    roomCount: number;
    checkInDate: string;
    checkOutDate: string;
    status: PartnerStayStatus;
    foodPlan: string;
  }>;
  transfers: Array<{
    id: string | null;
    travelLegIndex: number | null;
    routeLabel: string;
    pickupAt: string;
    pickupLocation: string;
    dropLocation: string;
    vehicleLabel: string;
    status: PartnerTransferStatus;
  }>;
};

type PartnerTravelProgress = Pick<PartnerTravelDraft, "travelLegs" | "stays" | "transfers">;

export function partnerTravelNeedsAttention(party: PartnerTravelProgress) {
  const activeLegs = party.travelLegs.filter((leg) => leg.status !== "CANCELLED");
  const missingPickup = party.travelLegs.some((leg, index) => {
    if (leg.status === "CANCELLED" || !leg.pickupRequired) return false;
    return !party.transfers.some(
      (transfer) =>
        transfer.travelLegIndex === index &&
        transfer.status !== "CANCELLED" &&
        transfer.status !== "NO_SHOW",
    );
  });
  const pendingTravel = activeLegs.some((leg) => leg.status !== "ARRIVED");
  const pendingStay = party.stays.some((stay) => ["PLANNED", "HELD"].includes(stay.status));
  return activeLegs.length === 0 || missingPickup || pendingTravel || pendingStay;
}

export function partnerTravelIsArrived(party: PartnerTravelProgress) {
  const activeLegs = party.travelLegs.filter((leg) => leg.status !== "CANCELLED");
  return activeLegs.length > 0 && activeLegs.every((leg) => leg.status === "ARRIVED");
}

type ParseResult =
  | { ok: true; value: PartnerTravelDraft }
  | { ok: false; error: string };

const FORBIDDEN_KEYS = new Set([
  "aadhaar",
  "aadhaarnumber",
  "passport",
  "passportnumber",
  "pannumber",
  "identitynumber",
  "governmentid",
  "pnr",
]);

function hasForbiddenKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasForbiddenKey);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(([key, nested]) => {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    return FORBIDDEN_KEYS.has(normalized) || hasForbiddenKey(nested);
  });
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function string(value: unknown, max: number, required = false) {
  if (value === undefined || value === null) return required ? null : "";
  if (typeof value !== "string") return null;
  const result = value.trim();
  if ((required && !result) || result.length > max) return null;
  return result;
}

function optionalUuid(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  return typeof value === "string" && isUuid(value) ? value : undefined;
}

function enumValue<const T extends readonly string[]>(value: unknown, values: T) {
  return typeof value === "string" && values.includes(value) ? (value as T[number]) : null;
}

function isoInstant(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function dateOnly(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
    ? null
    : value;
}

function boundedArray(value: unknown, max: number) {
  return Array.isArray(value) && value.length <= max ? value : null;
}

export function parsePartnerTravelDraft(value: unknown): ParseResult {
  if (hasForbiddenKey(value)) {
    return {
      ok: false,
      error: "Do not store passport, Aadhaar, PAN, full PNR, or identity numbers here",
    };
  }
  const root = record(value);
  const party = record(root?.party);
  if (!root || !party) return { ok: false, error: "Add valid travel-party details" };

  const partyId = optionalUuid(root.partyId);
  const bookingId = optionalUuid(party.bookingId);
  const vendorProfileId = optionalUuid(party.vendorProfileId);
  const weddingEventId = optionalUuid(party.weddingEventId);
  if (
    partyId === undefined ||
    bookingId === undefined ||
    vendorProfileId === undefined ||
    weddingEventId === undefined
  ) {
    return { ok: false, error: "Choose valid event, booking, and vendor references" };
  }
  const version = root.version === null || root.version === undefined
    ? null
    : Number.isInteger(root.version) && Number(root.version) > 0
      ? Number(root.version)
      : undefined;
  if (version === undefined) return { ok: false, error: "Reload this travel record" };

  const partyType = enumValue(party.partyType, PARTNER_PARTY_TYPES);
  const name = string(party.name, 180, true);
  const company = string(party.company, 180);
  const departmentLabel = string(party.departmentLabel, 120);
  const roleLabel = string(party.roleLabel, 120);
  const contactLabel = string(party.contactLabel, 180);
  const foodPlan = string(party.foodPlan, 500);
  const ownerLabel = string(party.ownerLabel, 160);
  const notes = string(party.notes, 1500);
  const headCount = Number(party.headCount);
  const perDiemAmount = party.perDiemAmount === null || party.perDiemAmount === ""
    ? null
    : Number(party.perDiemAmount);
  if (
    !partyType ||
    !name ||
    company === null ||
    departmentLabel === null ||
    roleLabel === null ||
    contactLabel === null ||
    foodPlan === null ||
    ownerLabel === null ||
    notes === null ||
    !Number.isInteger(headCount) ||
    headCount < 1 ||
    headCount > 500 ||
    (perDiemAmount !== null && (!Number.isFinite(perDiemAmount) || perDiemAmount < 0 || perDiemAmount > 100_000_000))
  ) {
    return { ok: false, error: "Complete the party name, size, and bounded operating details" };
  }

  const rawLegs = boundedArray(root.travelLegs, 16);
  const rawStays = boundedArray(root.stays, 8);
  const rawTransfers = boundedArray(root.transfers, 16);
  if (!rawLegs || !rawStays || !rawTransfers) {
    return { ok: false, error: "Too many travel, stay, or transfer rows" };
  }

  const travelLegs: PartnerTravelDraft["travelLegs"] = [];
  for (const raw of rawLegs) {
    const item = record(raw);
    const id = optionalUuid(item?.id);
    const mode = enumValue(item?.mode, PARTNER_TRAVEL_MODES);
    const provider = string(item?.provider, 180);
    const referenceLabel = string(item?.referenceLabel, 120);
    const origin = string(item?.origin, 180, true);
    const destination = string(item?.destination, 180, true);
    const departureAt = isoInstant(item?.departureAt);
    const arrivalAt = isoInstant(item?.arrivalAt);
    const status = enumValue(item?.status, PARTNER_TRAVEL_STATUSES);
    if (
      id === undefined || !mode || provider === null || referenceLabel === null ||
      !origin || !destination || !departureAt || !arrivalAt || !status ||
      new Date(arrivalAt) <= new Date(departureAt) || typeof item?.pickupRequired !== "boolean"
    ) return { ok: false, error: "Complete every travel leg with valid chronology" };
    travelLegs.push({ id, mode, provider, referenceLabel, origin, destination, departureAt, arrivalAt, status, pickupRequired: item.pickupRequired });
  }

  const stays: PartnerTravelDraft["stays"] = [];
  for (const raw of rawStays) {
    const item = record(raw);
    const id = optionalUuid(item?.id);
    const hotelName = string(item?.hotelName, 180, true);
    const roomType = string(item?.roomType, 120);
    const checkInDate = dateOnly(item?.checkInDate);
    const checkOutDate = dateOnly(item?.checkOutDate);
    const status = enumValue(item?.status, PARTNER_STAY_STATUSES);
    const stayFoodPlan = string(item?.foodPlan, 500);
    const roomCount = Number(item?.roomCount);
    if (
      id === undefined || !hotelName || roomType === null || !checkInDate || !checkOutDate ||
      checkOutDate <= checkInDate || !status || stayFoodPlan === null ||
      !Number.isInteger(roomCount) || roomCount < 1 || roomCount > 250
    ) return { ok: false, error: "Complete every stay with valid dates and room count" };
    stays.push({ id, hotelName, roomType, roomCount, checkInDate, checkOutDate, status, foodPlan: stayFoodPlan });
  }

  const transfers: PartnerTravelDraft["transfers"] = [];
  for (const raw of rawTransfers) {
    const item = record(raw);
    const id = optionalUuid(item?.id);
    const routeLabel = string(item?.routeLabel, 180, true);
    const pickupAt = isoInstant(item?.pickupAt);
    const pickupLocation = string(item?.pickupLocation, 240, true);
    const dropLocation = string(item?.dropLocation, 240, true);
    const vehicleLabel = string(item?.vehicleLabel, 120);
    const status = enumValue(item?.status, PARTNER_TRANSFER_STATUSES);
    const travelLegIndex = item?.travelLegIndex === null || item?.travelLegIndex === undefined
      ? null
      : Number(item.travelLegIndex);
    if (
      id === undefined || !routeLabel || !pickupAt || !pickupLocation || !dropLocation ||
      vehicleLabel === null || !status ||
      (travelLegIndex !== null && (!Number.isInteger(travelLegIndex) || travelLegIndex < 0 || travelLegIndex >= travelLegs.length))
    ) return { ok: false, error: "Complete every transfer and link it to this party's travel only" };
    transfers.push({ id, travelLegIndex, routeLabel, pickupAt, pickupLocation, dropLocation, vehicleLabel, status });
  }

  return {
    ok: true,
    value: {
      partyId,
      version,
      party: {
        bookingId,
        vendorProfileId,
        weddingEventId,
        partyType,
        name,
        company,
        departmentLabel,
        roleLabel,
        headCount,
        contactLabel,
        foodPlan,
        perDiemAmount,
        ownerLabel,
        notes,
      },
      travelLegs,
      stays,
      transfers,
    },
  };
}
