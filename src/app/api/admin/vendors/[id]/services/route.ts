import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  getAuthSession,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";
import { deleteVendorServiceImage } from "@/lib/supabase/storage";
import type { Database } from "@/types/database.types";

type VendorServiceInsert =
  Database["public"]["Tables"]["vendor_services"]["Insert"];
type VendorServiceUpdate =
  Database["public"]["Tables"]["vendor_services"]["Update"];

type ExistingServiceItem = {
  id: string;
  image_urls: string[] | null;
};

async function guard() {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "admin", "manager");
  if (roleCheck) return roleCheck;
  return null;
}

function amount(v: unknown): number | null {
  if (v === null || v === "" || v === undefined) return null;
  return typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.round(v)) : null;
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const g = await guard();
  if (g) return g;
  const { id } = await ctx.params;
  if (!id) return apiError("Invalid vendor id", 400);

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return apiError("Service name is required", 400);

    const supabase = createAdminSupabaseClient();
    const insert: VendorServiceInsert = {
      vendor_profile_id: id,
      name,
      description:
        typeof body.description === "string" ? body.description.trim() || null : null,
      base_price: amount(body.basePrice) ?? 0,
      max_price: amount(body.maxPrice),
      unit: typeof body.unit === "string" ? body.unit.trim() || null : null,
    };
    const { data, error } = await supabase
      .from("vendor_services")
      .insert(insert)
      .select("id, name, description, base_price, max_price, unit")
      .single();

    if (error || !data) {
      console.error("service create:", error);
      return apiError("Failed to add service", 500);
    }
    return apiSuccess(
      {
        service: {
          id: data.id,
          name: data.name,
          description: data.description,
          basePrice: data.base_price ?? null,
          maxPrice: data.max_price ?? null,
          unit: data.unit ?? null,
        },
      },
      201
    );
  } catch (e) {
    console.error("POST services", e);
    return apiError("Internal server error", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const g = await guard();
  if (g) return g;
  const { id } = await ctx.params;
  if (!id) return apiError("Invalid vendor id", 400);

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const serviceId = typeof body.serviceId === "string" ? body.serviceId : null;
    if (!serviceId) return apiError("serviceId is required", 400);

    const updates: VendorServiceUpdate = {};
    if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim();
    if (body.description !== undefined)
      updates.description =
        typeof body.description === "string" ? body.description.trim() || null : null;
    if (body.basePrice !== undefined) updates.base_price = amount(body.basePrice) ?? 0;
    if (body.maxPrice !== undefined) updates.max_price = amount(body.maxPrice);
    if (body.unit !== undefined)
      updates.unit = typeof body.unit === "string" ? body.unit.trim() || null : null;
    if (Object.keys(updates).length === 0) return apiError("Nothing to update", 400);

    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("vendor_services")
      .update(updates)
      .eq("id", serviceId)
      .eq("vendor_profile_id", id)
      .select("id, name, description, base_price, max_price, unit")
      .single();

    if (error) {
      console.error("service update:", error);
      return apiError("Failed to update service", 500);
    }
    return apiSuccess({
      service: {
        id: data.id,
        name: data.name,
        description: data.description,
        basePrice: data.base_price ?? null,
        maxPrice: data.max_price ?? null,
        unit: data.unit ?? null,
      },
    });
  } catch (e) {
    console.error("PATCH services", e);
    return apiError("Internal server error", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const g = await guard();
  if (g) return g;
  const { id } = await ctx.params;
  if (!id) return apiError("Invalid vendor id", 400);

  try {
    const serviceId = request.nextUrl.searchParams.get("serviceId");
    if (!serviceId) return apiError("serviceId is required", 400);

    const supabase = createAdminSupabaseClient();
    const [
      { data: service, error: serviceError },
      { data: bookings, error: bookingsError },
      { data: items, error: itemsError },
    ] = await Promise.all([
      supabase
        .from("vendor_services")
        .select("id")
        .eq("id", serviceId)
        .eq("vendor_profile_id", id)
        .maybeSingle(),
      supabase
        .from("bookings")
        .select("id")
        .eq("vendor_service_id", serviceId)
        .limit(1),
      supabase
        .from("vendor_service_items")
        .select("id, image_urls")
        .eq("vendor_service_id", serviceId),
    ]);

    if (serviceError) {
      console.error("service load:", serviceError);
      return apiError("Failed to load service", 500);
    }
    if (!service) return apiError("Service not found", 404);
    if (bookingsError) {
      console.error("service bookings check:", bookingsError);
      return apiError("Failed to check service bookings", 500);
    }
    if ((bookings ?? []).length > 0) {
      return apiError(
        "This service is attached to a booking. Deactivate it to hide it from new client selections.",
        409
      );
    }
    if (itemsError) {
      console.error("service media load:", itemsError);
      return apiError("Failed to load service media", 500);
    }

    const { error } = await supabase
      .from("vendor_services")
      .delete()
      .eq("id", serviceId)
      .eq("vendor_profile_id", id);
    if (error) {
      console.error("service delete:", error);
      return apiError("Failed to delete service", 500);
    }

    await Promise.all(
      ((items ?? []) as ExistingServiceItem[])
        .flatMap((item) => item.image_urls ?? [])
        .map((url) => deleteVendorServiceImage(url, id, serviceId))
    );

    return apiSuccess({ message: "Service removed" });
  } catch (e) {
    console.error("DELETE services", e);
    return apiError("Internal server error", 500);
  }
}
