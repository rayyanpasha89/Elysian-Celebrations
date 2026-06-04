import { NextRequest, NextResponse } from "next/server";
import { getClientWeddingContext } from "@/lib/wedding-plan.server";
import {
  EVENT_REQUIREMENT_CATEGORIES,
  normalizeEventRequirementPayload,
} from "@/lib/event-platform";
import {
  apiError,
  apiSuccess,
  getAuthSession,
  requireRole,
} from "@/lib/api-utils";

const ALLOWED_CATEGORIES = new Set(
  EVENT_REQUIREMENT_CATEGORIES.map((category) => category.key)
);
const ALLOWED_STATUSES = new Set([
  "DRAFT",
  "NEEDS_VENDOR",
  "QUOTE_NEEDED",
  "CONFIRMED",
  "DONE",
]);
const ALLOWED_PRIORITIES = new Set(["LOW", "NORMAL", "HIGH", "CRITICAL"]);

type RequirementDraft = {
  id?: unknown;
  category?: unknown;
  title?: unknown;
  status?: unknown;
  priority?: unknown;
  vendorProfileId?: unknown;
  vendorServiceId?: unknown;
  payload?: unknown;
  notes?: unknown;
};

type RequirementRow = {
  id: string;
  wedding_event_id: string;
  category: string;
  title: string;
  status: string;
  priority: string;
  vendor_profile_id: string | null;
  vendor_service_id: string | null;
  payload: Record<string, unknown> | null;
  notes: string | null;
  sort_order: number;
  vendor?: RequirementRelation<{
    id: string;
    business_name?: string | null;
    slug?: string | null;
  }>;
  service?: RequirementRelation<{
    id: string;
    name?: string | null;
    service_scope?: string | null;
    base_price?: number | null;
    max_price?: number | null;
    unit?: string | null;
  }>;
};

type RequirementRelation<T> = T | T[] | null;
type RequirementSupabase = Awaited<
  ReturnType<typeof getClientWeddingContext>
>["supabase"];

function firstRelation<T>(value: RequirementRelation<T> | undefined) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function toOptionalString(value: unknown, maxLength = 500) {
  return typeof value === "string" && value.trim()
    ? value.trim().replace(/\s+/g, " ").slice(0, maxLength)
    : null;
}

function toOptionalId(value: unknown) {
  return toOptionalString(value, 80);
}

function normalizeLookup(value: string) {
  return value.trim().toLowerCase().replace(/[\s_/]+/g, "-");
}

function normalizeCategory(value: unknown) {
  if (typeof value !== "string") return "custom";
  const lookup = normalizeLookup(value);
  return ALLOWED_CATEGORIES.has(lookup as never) ? lookup : "custom";
}

function normalizeStatus(value: unknown) {
  const status = toOptionalString(value, 40)?.toUpperCase();
  return status && ALLOWED_STATUSES.has(status) ? status : "DRAFT";
}

function normalizePriority(value: unknown) {
  const priority = toOptionalString(value, 40)?.toUpperCase();
  return priority && ALLOWED_PRIORITIES.has(priority) ? priority : "NORMAL";
}

function normalizeRequirements(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 60).map((entry: RequirementDraft, index) => {
    const category = normalizeCategory(entry.category);
    return {
      id: toOptionalId(entry.id),
      category,
      title:
        toOptionalString(entry.title, 160) ??
        EVENT_REQUIREMENT_CATEGORIES.find((item) => item.key === category)?.label ??
        "Requirement",
      status: normalizeStatus(entry.status),
      priority: normalizePriority(entry.priority),
      vendorProfileId: toOptionalId(entry.vendorProfileId),
      vendorServiceId: toOptionalId(entry.vendorServiceId),
      payload: normalizeEventRequirementPayload(entry.payload),
      notes: toOptionalString(entry.notes, 4000),
      sortOrder: index,
    };
  });
}

function mapRequirementRow(row: RequirementRow) {
  const vendor = firstRelation(row.vendor);
  const service = firstRelation(row.service);

  return {
    id: row.id,
    weddingEventId: row.wedding_event_id,
    category: row.category,
    title: row.title,
    status: row.status,
    priority: row.priority,
    vendorProfileId: row.vendor_profile_id,
    vendorServiceId: row.vendor_service_id,
    payload: row.payload ?? {},
    notes: row.notes,
    sortOrder: row.sort_order,
    vendor: vendor
      ? {
          id: vendor.id,
          businessName: vendor.business_name ?? "Vendor",
          slug: vendor.slug ?? "",
        }
      : null,
    service: service
      ? {
          id: service.id,
          name: service.name ?? "Service",
          serviceScope: service.service_scope ?? null,
          basePrice: service.base_price ?? null,
          maxPrice: service.max_price ?? null,
          unit: service.unit ?? null,
        }
      : null,
  };
}

async function requireClientEvent(eventId: string, userId: string) {
  const { supabase, wedding } = await getClientWeddingContext(userId);
  if (!wedding) {
    return { error: apiError("Wedding not found", 404), supabase, event: null };
  }

  const { data: event, error } = await supabase
    .from("wedding_events")
    .select("id, wedding_id")
    .eq("id", eventId)
    .eq("wedding_id", wedding.id)
    .maybeSingle();

  if (error) {
    console.error("wedding_events load:", error);
    return { error: apiError("Failed to load event", 500), supabase, event: null };
  }

  if (!event) {
    return { error: apiError("Event not found", 404), supabase, event: null };
  }

  return { error: null, supabase, event };
}

async function loadRequirements(supabase: RequirementSupabase, eventId: string) {
  const { data, error } = await supabase
    .from("wedding_event_requirements")
    .select(
      `id, wedding_event_id, category, title, status, priority, vendor_profile_id, vendor_service_id, payload, notes, sort_order,
      vendor:vendor_profiles(id, business_name, slug),
      service:vendor_services(id, name, service_scope, base_price, max_price, unit)`
    )
    .eq("wedding_event_id", eventId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("wedding_event_requirements load:", error);
    return { error: apiError("Failed to load requirements", 500), requirements: [] };
  }

  return {
    error: null,
    requirements: ((data ?? []) as RequirementRow[]).map(mapRequirementRow),
  };
}

async function resolveVendorLink(
  supabase: RequirementSupabase,
  vendorProfileId: string | null,
  vendorServiceId: string | null
) {
  if (vendorServiceId) {
    const { data: service, error } = await supabase
      .from("vendor_services")
      .select("id, vendor_profile_id")
      .eq("id", vendorServiceId)
      .maybeSingle();

    if (error) {
      console.error("vendor_services load:", error);
      return { error: apiError("Failed to validate vendor service", 500) };
    }

    if (!service?.id) {
      return { error: apiError("Vendor service not found", 404) };
    }

    return {
      error: null,
      vendorProfileId: service.vendor_profile_id as string,
      vendorServiceId,
    };
  }

  if (vendorProfileId) {
    const { data: vendor, error } = await supabase
      .from("vendor_profiles")
      .select("id")
      .eq("id", vendorProfileId)
      .maybeSingle();

    if (error) {
      console.error("vendor_profiles load:", error);
      return { error: apiError("Failed to validate vendor", 500) };
    }

    if (!vendor?.id) {
      return { error: apiError("Vendor not found", 404) };
    }
  }

  return { error: null, vendorProfileId, vendorServiceId: null };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "client");
  if (roleCheck) return roleCheck;

  try {
    const { id } = await params;
    const context = await requireClientEvent(id, session.userId);
    if (context.error) return context.error;

    const loaded = await loadRequirements(context.supabase, id);
    if (loaded.error) return loaded.error;

    return apiSuccess({ requirements: loaded.requirements });
  } catch (error) {
    console.error("GET /api/wedding/events/[id]/requirements", error);
    return apiError("Internal server error", 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "client");
  if (roleCheck) return roleCheck;

  try {
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const requirements = normalizeRequirements(body.requirements);

    const context = await requireClientEvent(id, session.userId);
    if (context.error) return context.error;
    const { supabase } = context;

    const { data: existingRows, error: existingError } = await supabase
      .from("wedding_event_requirements")
      .select("id")
      .eq("wedding_event_id", id);

    if (existingError) {
      console.error("wedding_event_requirements existing:", existingError);
      return apiError("Failed to load existing requirements", 500);
    }

    const existingIds = new Set(
      (existingRows ?? [])
        .map((row) => row.id)
        .filter((rowId): rowId is string => typeof rowId === "string")
    );
    const seenIds = new Set<string>();

    for (const requirement of requirements) {
      const vendorLink = await resolveVendorLink(
        supabase,
        requirement.vendorProfileId,
        requirement.vendorServiceId
      );
      if (vendorLink.error) return vendorLink.error;

      const payload = {
        wedding_event_id: id,
        category: requirement.category,
        title: requirement.title,
        status: requirement.status,
        priority: requirement.priority,
        vendor_profile_id: vendorLink.vendorProfileId,
        vendor_service_id: vendorLink.vendorServiceId,
        payload: requirement.payload,
        notes: requirement.notes,
        sort_order: requirement.sortOrder,
      };

      if (requirement.id && existingIds.has(requirement.id)) {
        const { error } = await supabase
          .from("wedding_event_requirements")
          .update(payload)
          .eq("id", requirement.id)
          .eq("wedding_event_id", id);

        if (error) {
          console.error("wedding_event_requirements update:", error);
          return apiError("Failed to update requirement", 500);
        }

        seenIds.add(requirement.id);
      } else {
        const { data: inserted, error } = await supabase
          .from("wedding_event_requirements")
          .insert(payload)
          .select("id")
          .single();

        if (error || !inserted) {
          console.error("wedding_event_requirements insert:", error);
          return apiError("Failed to create requirement", 500);
        }

        seenIds.add(inserted.id);
      }
    }

    const idsToDelete = [...existingIds].filter((rowId) => !seenIds.has(rowId));
    if (idsToDelete.length > 0) {
      const { error } = await supabase
        .from("wedding_event_requirements")
        .delete()
        .eq("wedding_event_id", id)
        .in("id", idsToDelete);

      if (error) {
        console.error("wedding_event_requirements delete:", error);
        return apiError("Failed to remove stale requirements", 500);
      }
    }

    const loaded = await loadRequirements(supabase, id);
    if (loaded.error) return loaded.error;

    return apiSuccess({ requirements: loaded.requirements });
  } catch (error) {
    console.error("PUT /api/wedding/events/[id]/requirements", error);
    return apiError("Internal server error", 500);
  }
}
