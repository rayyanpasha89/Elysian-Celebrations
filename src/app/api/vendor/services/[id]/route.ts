import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  getAuthSession,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";
import {
  normalizeOfferingArrays,
  normalizeServiceItems,
} from "@/lib/vendor-offering";
import { deleteVendorServiceImage } from "@/lib/supabase/storage";

type ExistingServiceItem = {
  id: string;
  image_urls: string[] | null;
};

function itemPayload(
  item: ReturnType<typeof normalizeServiceItems>[number],
  vendorServiceId: string,
  fallbackSortOrder: number
) {
  return {
    vendor_service_id: vendorServiceId,
    item_type: item.itemType,
    name: item.name,
    description: item.description,
    dietary_tags: item.dietaryTags,
    image_urls: item.imageUrls,
    reference_url: item.referenceUrl,
    sort_order: item.sortOrder ?? fallbackSortOrder,
  };
}

async function cleanupRemovedImages(
  existingItems: ExistingServiceItem[],
  nextItems: ReturnType<typeof normalizeServiceItems>,
  vendorProfileId: string,
  vendorServiceId: string
) {
  const retainedUrls = new Set(nextItems.flatMap((item) => item.imageUrls));
  const removedUrls = [...new Set(existingItems.flatMap((item) => item.image_urls ?? []))].filter(
    (url) => !retainedUrls.has(url)
  );

  await Promise.all(
    removedUrls.map((url) =>
      deleteVendorServiceImage(url, vendorProfileId, vendorServiceId)
    )
  );
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "vendor");
  if (roleCheck) return roleCheck;

  const { id } = await ctx.params;
  if (!id) return apiError("Invalid id", 400);

  try {
    const supabase = createAdminSupabaseClient();
    const { data: vp } = await supabase
      .from("vendor_profiles")
      .select("id")
      .eq("user_id", session.userId)
      .maybeSingle();
    if (!vp) return apiError("Vendor profile not found", 404);

    const { data: existing } = await supabase
      .from("vendor_services")
      .select("id")
      .eq("id", id)
      .eq("vendor_profile_id", vp.id)
      .maybeSingle();
    if (!existing) return apiError("Service not found", 404);

    const body = (await request.json()) as Record<string, unknown>;
    const updates: Record<string, unknown> = {};
    if (typeof body.name === "string") updates.name = body.name.trim();
    if (typeof body.description === "string") updates.description = body.description;
    if (typeof body.serviceScope === "string")
      updates.service_scope = body.serviceScope.trim() || null;
    if (typeof body.basePrice === "number") updates.base_price = Math.floor(body.basePrice);
    if (typeof body.maxPrice === "number") updates.max_price = Math.floor(body.maxPrice);
    if (body.maxPrice === null) updates.max_price = null;
    if (typeof body.unit === "string") updates.unit = body.unit;
    if (typeof body.isActive === "boolean") updates.is_active = body.isActive;

    const offering = normalizeOfferingArrays(body);
    if (Array.isArray(body.eventTypeFit)) updates.event_type_fit = offering.eventTypeFit;
    if (Array.isArray(body.inclusions)) updates.inclusions = offering.inclusions;
    if (Array.isArray(body.deliverables)) updates.deliverables = offering.deliverables;
    if (Array.isArray(body.addOns)) updates.add_ons = offering.addOns;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from("vendor_services")
        .update(updates)
        .eq("id", id);
      if (error) {
        console.error("vendor_services update:", error);
        return apiError("Failed to update service", 500);
      }
    }

    if (Array.isArray(body.items)) {
      const items = normalizeServiceItems(body.items);
      const { data: existingItemsData, error: existingItemsError } = await supabase
        .from("vendor_service_items")
        .select("id, image_urls")
        .eq("vendor_service_id", id);
      if (existingItemsError) {
        console.error("vendor_service_items load:", existingItemsError);
        return apiError("Failed to load catalogue items", 500);
      }

      const existingItems = (existingItemsData ?? []) as ExistingServiceItem[];
      const existingById = new Map(existingItems.map((item) => [item.id, item]));
      const retainedIds = new Set<string>();

      for (const [index, item] of items.entries()) {
        const payload = itemPayload(item, id, index);
        const existingItem = item.id ? existingById.get(item.id) : null;

        if (existingItem) {
          retainedIds.add(existingItem.id);
          const { error: updateItemError } = await supabase
            .from("vendor_service_items")
            .update(payload)
            .eq("id", existingItem.id)
            .eq("vendor_service_id", id);
          if (updateItemError) {
            console.error("vendor_service_items update:", updateItemError);
            return apiError("Failed to update catalogue item", 500);
          }
          continue;
        }

        const { error: insertItemError } = await supabase
          .from("vendor_service_items")
          .insert(payload);
        if (insertItemError) {
          console.error("vendor_service_items insert:", insertItemError);
          return apiError("Failed to add catalogue item", 500);
        }
      }

      const removedIds = existingItems
        .filter((item) => !retainedIds.has(item.id))
        .map((item) => item.id);
      if (removedIds.length > 0) {
        const { error: deleteItemsError } = await supabase
          .from("vendor_service_items")
          .delete()
          .in("id", removedIds)
          .eq("vendor_service_id", id);
        if (deleteItemsError) {
          console.error("vendor_service_items delete:", deleteItemsError);
          return apiError("Failed to remove catalogue item", 500);
        }
      }

      await cleanupRemovedImages(existingItems, items, vp.id, id);
    }

    const { data: row, error: fetchError } = await supabase
      .from("vendor_services")
      .select(
        "*, items:vendor_service_items(id, item_type, name, description, dietary_tags, image_urls, reference_url, sort_order)"
      )
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !row) {
      return apiError("Failed to load updated service", 500);
    }

    return apiSuccess(row);
  } catch (e) {
    console.error("PATCH /api/vendor/services/[id]", e);
    return apiError("Internal server error", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "vendor");
  if (roleCheck) return roleCheck;

  const { id } = await ctx.params;
  if (!id) return apiError("Invalid id", 400);

  try {
    const supabase = createAdminSupabaseClient();
    const { data: vp } = await supabase
      .from("vendor_profiles")
      .select("id")
      .eq("user_id", session.userId)
      .maybeSingle();
    if (!vp) return apiError("Vendor profile not found", 404);

    const [{ data: service, error: serviceError }, { data: bookings, error: bookingsError }, { data: items, error: itemsError }] =
      await Promise.all([
        supabase
          .from("vendor_services")
          .select("id")
          .eq("id", id)
          .eq("vendor_profile_id", vp.id)
          .maybeSingle(),
        supabase
          .from("bookings")
          .select("id")
          .eq("vendor_service_id", id)
          .limit(1),
        supabase
          .from("vendor_service_items")
          .select("id, image_urls")
          .eq("vendor_service_id", id),
      ]);

    if (serviceError) {
      console.error("vendor_services load:", serviceError);
      return apiError("Failed to load service", 500);
    }
    if (!service) return apiError("Service not found", 404);
    if (bookingsError) {
      console.error("vendor_services bookings check:", bookingsError);
      return apiError("Failed to check service bookings", 500);
    }
    if ((bookings ?? []).length > 0) {
      return apiError(
        "This service is attached to a booking. Deactivate it to hide it from new client selections.",
        409
      );
    }
    if (itemsError) {
      console.error("vendor_service_items load:", itemsError);
      return apiError("Failed to load service media", 500);
    }

    const { error } = await supabase
      .from("vendor_services")
      .delete()
      .eq("id", id)
      .eq("vendor_profile_id", vp.id);

    if (error) {
      console.error("vendor_services delete:", error);
      return apiError("Failed to delete service", 500);
    }

    await Promise.all(
      ((items ?? []) as ExistingServiceItem[])
        .flatMap((item) => item.image_urls ?? [])
        .map((url) => deleteVendorServiceImage(url, vp.id, id))
    );

    return apiSuccess({ ok: true });
  } catch (e) {
    console.error("DELETE /api/vendor/services/[id]", e);
    return apiError("Internal server error", 500);
  }
}
