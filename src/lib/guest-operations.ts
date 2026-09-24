export const GUEST_INVITATION_STATUSES = [
  "NOT_INVITED",
  "INVITED",
  "CONFIRMED",
  "DECLINED",
  "WAITLIST",
] as const;

export const GUEST_VIP_LEVELS = ["STANDARD", "VIP", "VVIP"] as const;

export const GUEST_TRAVEL_MODES = [
  "FLIGHT",
  "TRAIN",
  "CAR",
  "COACH",
  "BUS",
  "BOAT",
  "OTHER",
] as const;

export const GUEST_TRAVEL_STATUSES = [
  "OPTION",
  "PLANNED",
  "BOOKED",
  "CHECKED_IN",
  "ARRIVED",
  "CANCELLED",
] as const;

export const GUEST_STAY_STATUSES = [
  "PLANNED",
  "HELD",
  "ALLOCATED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "CANCELLED",
] as const;

export const GUEST_KEY_STATUSES = [
  "NOT_REQUIRED",
  "PENDING",
  "READY",
  "ISSUED",
  "RETURNED",
  "LOST",
] as const;

export const GUEST_LUGGAGE_STATUSES = [
  "NOT_REQUIRED",
  "EXPECTED",
  "RECEIVED",
  "IN_TRANSIT",
  "IN_ROOM",
  "COLLECTED",
  "MISSING",
] as const;

export const GUEST_TRANSFER_STATUSES = [
  "PLANNED",
  "ASSIGNED",
  "DISPATCHED",
  "PICKED_UP",
  "DROPPED",
  "NO_SHOW",
  "CANCELLED",
] as const;

export const GUEST_HOSPITALITY_TYPES = [
  "WELCOME",
  "HAMPER",
  "SALON",
  "BUTLER",
  "MEAL",
  "ACCESSIBILITY",
  "SERVICE_RECOVERY",
  "OTHER",
] as const;

export const GUEST_HOSPITALITY_STATUSES = [
  "PLANNED",
  "IN_PROGRESS",
  "WAITING",
  "DONE",
  "CANCELLED",
] as const;

export type GuestInvitationStatus = (typeof GUEST_INVITATION_STATUSES)[number];
export type GuestVipLevel = (typeof GUEST_VIP_LEVELS)[number];
export type GuestTravelMode = (typeof GUEST_TRAVEL_MODES)[number];
export type GuestTravelStatus = (typeof GUEST_TRAVEL_STATUSES)[number];
export type GuestStayStatus = (typeof GUEST_STAY_STATUSES)[number];
export type GuestKeyStatus = (typeof GUEST_KEY_STATUSES)[number];
export type GuestLuggageStatus = (typeof GUEST_LUGGAGE_STATUSES)[number];
export type GuestTransferStatus = (typeof GUEST_TRANSFER_STATUSES)[number];
export type GuestHospitalityType = (typeof GUEST_HOSPITALITY_TYPES)[number];
export type GuestHospitalityStatus = (typeof GUEST_HOSPITALITY_STATUSES)[number];

export type GuestOperationsSnapshot = {
  weddingId: string;
  version: number | null;
  profile: {
    householdName: string | null;
    relationshipGroup: string | null;
    invitationStatus: GuestInvitationStatus;
    vipLevel: GuestVipLevel;
    accessibilityNotes: string | null;
    ownerLabel: string | null;
  };
  travelLegs: Array<{
    id: string | null;
    mode: GuestTravelMode;
    provider: string | null;
    referenceLabel: string | null;
    origin: string;
    destination: string;
    departureAt: string;
    arrivalAt: string;
    status: GuestTravelStatus;
    pickupRequired: boolean;
    notes: string | null;
  }>;
  stays: Array<{
    id: string | null;
    hotelName: string;
    roomType: string | null;
    roomNumber: string | null;
    checkInDate: string;
    checkOutDate: string;
    status: GuestStayStatus;
    keyStatus: GuestKeyStatus;
    luggageStatus: GuestLuggageStatus;
    notes: string | null;
  }>;
  transfers: Array<{
    id: string | null;
    travelLegIndex: number | null;
    vehicleLabel: string | null;
    routeLabel: string;
    pickupAt: string;
    pickupLocation: string;
    dropLocation: string;
    seatLabel: string | null;
    status: GuestTransferStatus;
    notes: string | null;
  }>;
  hospitalityItems: Array<{
    id: string | null;
    type: GuestHospitalityType;
    title: string;
    status: GuestHospitalityStatus;
    ownerLabel: string | null;
    dueAt: string | null;
    notes: string | null;
  }>;
};

type ParseResult =
  | { ok: true; value: GuestOperationsSnapshot }
  | { ok: false; error: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredText(value: unknown, label: string, maximum: number) {
  if (typeof value !== "string" || !value.trim()) {
    return { ok: false as const, error: `${label} is required` };
  }
  const text = value.trim();
  if (text.length > maximum) {
    const verb = label.toLowerCase().endsWith("notes") ? "are" : "is";
    return { ok: false as const, error: `${label} ${verb} too long` };
  }
  return { ok: true as const, value: text };
}

function optionalText(value: unknown, label: string, maximum: number) {
  if (value === undefined || value === null || value === "") {
    return { ok: true as const, value: null };
  }
  if (typeof value !== "string") {
    return { ok: false as const, error: `${label} must be text` };
  }
  const text = value.trim();
  if (text.length > maximum) {
    const verb = label.toLowerCase().endsWith("notes") ? "are" : "is";
    return { ok: false as const, error: `${label} ${verb} too long` };
  }
  return { ok: true as const, value: text || null };
}

function enumValue<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  label: string,
  fallback: T[number]
) {
  const candidate = value ?? fallback;
  if (typeof candidate !== "string" || !allowed.includes(candidate)) {
    return { ok: false as const, error: `Choose a valid ${label}` };
  }
  return { ok: true as const, value: candidate as T[number] };
}

function optionalId(value: unknown, label: string) {
  if (value === undefined || value === null || value === "") {
    return { ok: true as const, value: null };
  }
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    return { ok: false as const, error: `Choose a valid ${label}` };
  }
  return { ok: true as const, value };
}

function instant(value: unknown, label: string) {
  if (typeof value !== "string") {
    return { ok: false as const, error: `Choose a valid ${label}` };
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { ok: false as const, error: `Choose a valid ${label}` };
  }
  return { ok: true as const, value: parsed.toISOString() };
}

function optionalInstant(value: unknown, label: string) {
  if (value === undefined || value === null || value === "") {
    return { ok: true as const, value: null };
  }
  return instant(value, label);
}

function dateOnly(value: unknown, label: string) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    return { ok: false as const, error: `Choose a valid ${label}` };
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return { ok: false as const, error: `Choose a valid ${label}` };
  }
  return { ok: true as const, value };
}

function arrayValue(value: unknown, label: string, maximum: number) {
  const list = value ?? [];
  if (!Array.isArray(list)) {
    return { ok: false as const, error: `${label} must be a list` };
  }
  if (list.length > maximum) {
    return { ok: false as const, error: `A guest can have at most ${maximum} ${label.toLowerCase()}` };
  }
  return { ok: true as const, value: list };
}

export function parseGuestOperationsSnapshot(value: unknown): ParseResult {
  if (!isObject(value)) return { ok: false, error: "Invalid guest operations" };
  if (typeof value.weddingId !== "string" || !UUID_PATTERN.test(value.weddingId)) {
    return { ok: false, error: "Choose a valid event" };
  }

  const versionValue = value.version ?? null;
  if (
    versionValue !== null &&
    (!Number.isSafeInteger(versionValue) || Number(versionValue) < 1)
  ) {
    return { ok: false, error: "Choose a valid guest operations version" };
  }

  const profileValue = value.profile ?? {};
  if (!isObject(profileValue)) return { ok: false, error: "Invalid guest profile details" };
  const householdName = optionalText(profileValue.householdName, "Household name", 180);
  if (!householdName.ok) return householdName;
  const relationshipGroup = optionalText(
    profileValue.relationshipGroup,
    "Relationship group",
    180
  );
  if (!relationshipGroup.ok) return relationshipGroup;
  const invitationStatus = enumValue(
    profileValue.invitationStatus,
    GUEST_INVITATION_STATUSES,
    "invitation status",
    "NOT_INVITED"
  );
  if (!invitationStatus.ok) return invitationStatus;
  const vipLevel = enumValue(profileValue.vipLevel, GUEST_VIP_LEVELS, "VIP level", "STANDARD");
  if (!vipLevel.ok) return vipLevel;
  const accessibilityNotes = optionalText(
    profileValue.accessibilityNotes,
    "Accessibility notes",
    2000
  );
  if (!accessibilityNotes.ok) return accessibilityNotes;
  const ownerLabel = optionalText(profileValue.ownerLabel, "Hospitality owner", 160);
  if (!ownerLabel.ok) return ownerLabel;

  const travelInput = arrayValue(value.travelLegs, "travel legs", 16);
  if (!travelInput.ok) return travelInput;
  const travelLegs: GuestOperationsSnapshot["travelLegs"] = [];
  for (const entry of travelInput.value) {
    if (!isObject(entry)) return { ok: false, error: "Invalid travel leg" };
    const id = optionalId(entry.id, "travel leg");
    if (!id.ok) return id;
    const mode = enumValue(entry.mode, GUEST_TRAVEL_MODES, "travel mode", "FLIGHT");
    if (!mode.ok) return mode;
    const provider = optionalText(entry.provider, "Travel provider", 180);
    if (!provider.ok) return provider;
    const referenceLabel = optionalText(entry.referenceLabel, "Booking reference label", 180);
    if (!referenceLabel.ok) return referenceLabel;
    const origin = requiredText(entry.origin, "Travel origin", 180);
    if (!origin.ok) return origin;
    const destination = requiredText(entry.destination, "Travel destination", 180);
    if (!destination.ok) return destination;
    const departureAt = instant(entry.departureAt, "departure time");
    if (!departureAt.ok) return departureAt;
    const arrivalAt = instant(entry.arrivalAt, "arrival time");
    if (!arrivalAt.ok) return arrivalAt;
    if (new Date(arrivalAt.value).getTime() <= new Date(departureAt.value).getTime()) {
      return { ok: false, error: "Travel arrival must be after departure" };
    }
    const status = enumValue(entry.status, GUEST_TRAVEL_STATUSES, "travel status", "PLANNED");
    if (!status.ok) return status;
    if (entry.pickupRequired !== undefined && typeof entry.pickupRequired !== "boolean") {
      return { ok: false, error: "Pickup required must be yes or no" };
    }
    const notes = optionalText(entry.notes, "Travel notes", 2000);
    if (!notes.ok) return notes;
    travelLegs.push({
      id: id.value,
      mode: mode.value,
      provider: provider.value,
      referenceLabel: referenceLabel.value,
      origin: origin.value,
      destination: destination.value,
      departureAt: departureAt.value,
      arrivalAt: arrivalAt.value,
      status: status.value,
      pickupRequired: entry.pickupRequired === true,
      notes: notes.value,
    });
  }

  const staysInput = arrayValue(value.stays, "hotel stays", 8);
  if (!staysInput.ok) return staysInput;
  const stays: GuestOperationsSnapshot["stays"] = [];
  for (const entry of staysInput.value) {
    if (!isObject(entry)) return { ok: false, error: "Invalid hotel stay" };
    const id = optionalId(entry.id, "hotel stay");
    if (!id.ok) return id;
    const hotelName = requiredText(entry.hotelName, "Hotel name", 180);
    if (!hotelName.ok) return hotelName;
    const roomType = optionalText(entry.roomType, "Room type", 120);
    if (!roomType.ok) return roomType;
    const roomNumber = optionalText(entry.roomNumber, "Room number", 80);
    if (!roomNumber.ok) return roomNumber;
    const checkInDate = dateOnly(entry.checkInDate, "check-in date");
    if (!checkInDate.ok) return checkInDate;
    const checkOutDate = dateOnly(entry.checkOutDate, "checkout date");
    if (!checkOutDate.ok) return checkOutDate;
    if (checkOutDate.value <= checkInDate.value) {
      return { ok: false, error: "Hotel checkout must be after check-in" };
    }
    const status = enumValue(entry.status, GUEST_STAY_STATUSES, "stay status", "PLANNED");
    if (!status.ok) return status;
    const keyStatus = enumValue(entry.keyStatus, GUEST_KEY_STATUSES, "key status", "PENDING");
    if (!keyStatus.ok) return keyStatus;
    const luggageStatus = enumValue(
      entry.luggageStatus,
      GUEST_LUGGAGE_STATUSES,
      "luggage status",
      "EXPECTED"
    );
    if (!luggageStatus.ok) return luggageStatus;
    const notes = optionalText(entry.notes, "Stay notes", 2000);
    if (!notes.ok) return notes;
    stays.push({
      id: id.value,
      hotelName: hotelName.value,
      roomType: roomType.value,
      roomNumber: roomNumber.value,
      checkInDate: checkInDate.value,
      checkOutDate: checkOutDate.value,
      status: status.value,
      keyStatus: keyStatus.value,
      luggageStatus: luggageStatus.value,
      notes: notes.value,
    });
  }

  const transfersInput = arrayValue(value.transfers, "transfers", 16);
  if (!transfersInput.ok) return transfersInput;
  const transfers: GuestOperationsSnapshot["transfers"] = [];
  for (const entry of transfersInput.value) {
    if (!isObject(entry)) return { ok: false, error: "Invalid transfer" };
    const id = optionalId(entry.id, "transfer");
    if (!id.ok) return id;
    let travelLegIndex: number | null = null;
    if (entry.travelLegIndex !== undefined && entry.travelLegIndex !== null && entry.travelLegIndex !== "") {
      if (!Number.isSafeInteger(entry.travelLegIndex) || Number(entry.travelLegIndex) < 0) {
        return { ok: false, error: "Transfer travel leg does not exist" };
      }
      travelLegIndex = Number(entry.travelLegIndex);
      if (travelLegIndex >= travelLegs.length) {
        return { ok: false, error: "Transfer travel leg does not exist" };
      }
    }
    const vehicleLabel = optionalText(entry.vehicleLabel, "Vehicle label", 120);
    if (!vehicleLabel.ok) return vehicleLabel;
    const routeLabel = requiredText(entry.routeLabel, "Transfer route", 180);
    if (!routeLabel.ok) return routeLabel;
    const pickupAt = instant(entry.pickupAt, "pickup time");
    if (!pickupAt.ok) return pickupAt;
    const pickupLocation = requiredText(entry.pickupLocation, "Pickup location", 240);
    if (!pickupLocation.ok) return pickupLocation;
    const dropLocation = requiredText(entry.dropLocation, "Drop location", 240);
    if (!dropLocation.ok) return dropLocation;
    const seatLabel = optionalText(entry.seatLabel, "Seat label", 80);
    if (!seatLabel.ok) return seatLabel;
    const status = enumValue(
      entry.status,
      GUEST_TRANSFER_STATUSES,
      "transfer status",
      "PLANNED"
    );
    if (!status.ok) return status;
    const notes = optionalText(entry.notes, "Transfer notes", 2000);
    if (!notes.ok) return notes;
    transfers.push({
      id: id.value,
      travelLegIndex,
      vehicleLabel: vehicleLabel.value,
      routeLabel: routeLabel.value,
      pickupAt: pickupAt.value,
      pickupLocation: pickupLocation.value,
      dropLocation: dropLocation.value,
      seatLabel: seatLabel.value,
      status: status.value,
      notes: notes.value,
    });
  }

  const hospitalityInput = arrayValue(value.hospitalityItems, "hospitality actions", 24);
  if (!hospitalityInput.ok) return hospitalityInput;
  const hospitalityItems: GuestOperationsSnapshot["hospitalityItems"] = [];
  for (const entry of hospitalityInput.value) {
    if (!isObject(entry)) return { ok: false, error: "Invalid hospitality action" };
    const id = optionalId(entry.id, "hospitality action");
    if (!id.ok) return id;
    const type = enumValue(
      entry.type,
      GUEST_HOSPITALITY_TYPES,
      "hospitality type",
      "OTHER"
    );
    if (!type.ok) return type;
    const title = requiredText(entry.title, "Hospitality action", 180);
    if (!title.ok) return title;
    const status = enumValue(
      entry.status,
      GUEST_HOSPITALITY_STATUSES,
      "hospitality status",
      "PLANNED"
    );
    if (!status.ok) return status;
    const owner = optionalText(entry.ownerLabel, "Hospitality action owner", 160);
    if (!owner.ok) return owner;
    const dueAt = optionalInstant(entry.dueAt, "hospitality due time");
    if (!dueAt.ok) return dueAt;
    const notes = optionalText(entry.notes, "Hospitality notes", 2000);
    if (!notes.ok) return notes;
    hospitalityItems.push({
      id: id.value,
      type: type.value,
      title: title.value,
      status: status.value,
      ownerLabel: owner.value,
      dueAt: dueAt.value,
      notes: notes.value,
    });
  }

  return {
    ok: true,
    value: {
      weddingId: value.weddingId,
      version: versionValue === null ? null : Number(versionValue),
      profile: {
        householdName: householdName.value,
        relationshipGroup: relationshipGroup.value,
        invitationStatus: invitationStatus.value,
        vipLevel: vipLevel.value,
        accessibilityNotes: accessibilityNotes.value,
        ownerLabel: ownerLabel.value,
      },
      travelLegs,
      stays,
      transfers,
      hospitalityItems,
    },
  };
}
