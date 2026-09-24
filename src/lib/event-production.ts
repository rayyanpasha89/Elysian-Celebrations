export const PRODUCTION_RECORD_TYPES = [
  "DOCUMENT",
  "CONTRACT",
  "RIDER",
  "LICENSE",
  "PERMISSION",
  "RECCE",
  "APPROVAL",
  "PROCUREMENT",
  "TRANSPORT",
  "ROOMING",
  "HOSPITALITY",
  "GUEST_COMMUNICATION",
  "INVENTORY",
  "PACKING",
  "STATIONERY",
  "ALCOHOL",
  "EXPENSE",
  "REIMBURSEMENT",
  "FAMILY_BRIEF",
  "OTHER",
] as const;

export const PRODUCTION_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING",
  "APPROVED",
  "DONE",
  "CANCELLED",
] as const;

export const PRODUCTION_VISIBILITIES = [
  "CLIENT",
  "OPERATIONS",
  "FINANCE",
  "PRIVATE",
] as const;

export type ProductionRecordType = (typeof PRODUCTION_RECORD_TYPES)[number];
export type ProductionStatus = (typeof PRODUCTION_STATUSES)[number];
export type ProductionVisibility = (typeof PRODUCTION_VISIBILITIES)[number];
export type ProductionGroup =
  | "procurement"
  | "documents"
  | "compliance"
  | "travel"
  | "communications"
  | "inventory"
  | "finance"
  | "family";

const TYPE_META: Record<
  ProductionRecordType,
  { label: string; group: ProductionGroup; prompt: string }
> = {
  DOCUMENT: { label: "Document", group: "documents", prompt: "File, layout, menu, brief, or operating reference" },
  CONTRACT: { label: "Contract", group: "documents", prompt: "Signed scope, terms, milestones, and expiry" },
  RIDER: { label: "Rider", group: "documents", prompt: "Technical or hospitality commitments" },
  LICENSE: { label: "License", group: "compliance", prompt: "Music, alcohol, drone, fire, or statutory license" },
  PERMISSION: { label: "Permission", group: "compliance", prompt: "Venue, security, access, or authority approval" },
  RECCE: { label: "Recce", group: "compliance", prompt: "Visit agenda, finding, decision, and follow-up" },
  APPROVAL: { label: "Approval", group: "compliance", prompt: "Creative, operational, or commercial sign-off" },
  PROCUREMENT: { label: "Procurement", group: "procurement", prompt: "Option, recommendation, selection, or purchase" },
  TRANSPORT: { label: "Transport", group: "travel", prompt: "Route, vehicle, passenger group, or transfer" },
  ROOMING: { label: "Rooming", group: "travel", prompt: "Hotel block, room allocation, key, or checkout" },
  HOSPITALITY: { label: "Hospitality", group: "travel", prompt: "Welcome, luggage, hamper, salon, or guest care" },
  GUEST_COMMUNICATION: { label: "Guest communication", group: "communications", prompt: "Approved guest message, audience, and send state" },
  INVENTORY: { label: "Inventory", group: "inventory", prompt: "Quantity, custody, issue, return, or damage" },
  PACKING: { label: "Packing and truck", group: "inventory", prompt: "Box, vehicle, load, unload, or handover" },
  STATIONERY: { label: "Stationery and signage", group: "inventory", prompt: "Artwork, print, delivery, or placement" },
  ALCOHOL: { label: "Alcohol and bar", group: "inventory", prompt: "Stock, handover, seal, issue, or return" },
  EXPENSE: { label: "Expense", group: "finance", prompt: "Operational expense separate from client billing" },
  REIMBURSEMENT: { label: "Reimbursement", group: "finance", prompt: "Advance, claimant, approval, and settlement" },
  FAMILY_BRIEF: { label: "Family and VIP brief", group: "family", prompt: "Relationship, ritual role, VIP care, or photography group" },
  OTHER: { label: "Other production record", group: "documents", prompt: "A production item outside the standard registers" },
};

type ProductionInput = {
  recordType: ProductionRecordType;
  title: string;
  description: string | null;
  status: ProductionStatus;
  visibility: ProductionVisibility;
  ownerLabel: string | null;
  dueAt: string | null;
  amount: number | null;
  currency: string;
  payload: Record<string, unknown>;
};

type ParseResult =
  | { ok: true; value: ProductionInput }
  | { ok: false; error: string };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalText(value: unknown, maximum: number) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  return value.trim().slice(0, maximum) || null;
}

export function productionTypeMeta(value: ProductionRecordType) {
  return TYPE_META[value];
}

export function parseProductionRecordInput(value: unknown): ParseResult {
  if (!isObject(value)) return { ok: false, error: "Invalid production record" };
  if (!(PRODUCTION_RECORD_TYPES as readonly unknown[]).includes(value.recordType)) {
    return { ok: false, error: "Choose a valid production record type" };
  }
  const title = optionalText(value.title, 180);
  if (!title) return { ok: false, error: "Add a concise title" };
  const description = optionalText(value.description, 8000);
  if (description === undefined) return { ok: false, error: "Description must be text" };

  const status = value.status ?? "OPEN";
  if (!(PRODUCTION_STATUSES as readonly unknown[]).includes(status)) {
    return { ok: false, error: "Choose a valid production status" };
  }
  const visibility = value.visibility ?? "OPERATIONS";
  if (!(PRODUCTION_VISIBILITIES as readonly unknown[]).includes(visibility)) {
    return { ok: false, error: "Choose a valid visibility" };
  }
  const ownerLabel = optionalText(value.ownerLabel, 160);
  if (ownerLabel === undefined) return { ok: false, error: "Owner must be text" };

  let dueAt: string | null = null;
  if (value.dueAt !== undefined && value.dueAt !== null && value.dueAt !== "") {
    if (typeof value.dueAt !== "string") return { ok: false, error: "Choose a valid due date" };
    const parsed = new Date(value.dueAt);
    if (Number.isNaN(parsed.getTime())) return { ok: false, error: "Choose a valid due date" };
    dueAt = parsed.toISOString();
  }

  let amount: number | null = null;
  if (value.amount !== undefined && value.amount !== null && value.amount !== "") {
    const parsed = Number(value.amount);
    if (!Number.isSafeInteger(parsed) || parsed < 0) {
      return { ok: false, error: "Amount must be a whole non-negative value" };
    }
    amount = parsed;
  }
  const currency = typeof value.currency === "string" ? value.currency.trim().toUpperCase() : "INR";
  if (!/^[A-Z]{3}$/.test(currency)) return { ok: false, error: "Choose a valid currency" };

  const payload = value.payload ?? {};
  if (!isObject(payload)) return { ok: false, error: "Production details must be an object" };
  if (JSON.stringify(payload).length > 24000) {
    return { ok: false, error: "Production details are too large" };
  }

  return {
    ok: true,
    value: {
      recordType: value.recordType as ProductionRecordType,
      title,
      description,
      status: status as ProductionStatus,
      visibility: visibility as ProductionVisibility,
      ownerLabel,
      dueAt,
      amount,
      currency,
      payload,
    },
  };
}
