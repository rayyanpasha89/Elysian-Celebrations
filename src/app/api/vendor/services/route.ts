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

export async function GET() {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "vendor");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();
    const { data: vp, error: vErr } = await supabase
      .from("vendor_profiles")
      .select("id, category:vendor_categories(slug)")
      .eq("user_id", session.userId)
      .maybeSingle();
    if (vErr) {
      console.error("vendor_profiles:", vErr);
      return apiError("Failed to load vendor", 500);
    }
    if (!vp) {
      return apiSuccess({ services: [], categorySlug: null });
    }

    const { data: services, error } = await supabase
      .from("vendor_services")
      .select(
        "*, items:vendor_service_items(id, item_type, name, description, dietary_tags, image_urls, reference_url, sort_order)"
      )
      .eq("vendor_profile_id", vp.id)
      .order("name");

    if (error) {
      console.error("vendor_services:", error);
      return apiError("Failed to load services", 500);
    }

    const categorySlug = Array.isArray(vp.category)
      ? vp.category[0]?.slug ?? null
      : (vp.category as { slug?: string } | null)?.slug ?? null;

    return apiSuccess({ services: services ?? [], categorySlug });
  } catch (e) {
    console.error("GET /api/vendor/services", e);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "vendor");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();
    const body = (await request.json()) as Record<string, unknown>;
    const { name, description, basePrice, maxPrice, unit, serviceScope } = body;

    if (!name || typeof name !== "string") {
      return apiError("Name is required");
    }
    const price =
      typeof basePrice === "number" ? basePrice : Number(basePrice);
    if (!Number.isFinite(price) || price < 0) {
      return apiError("Valid base price is required");
    }

    const { data: vp, error: vErr } = await supabase
      .from("vendor_profiles")
      .select("id")
      .eq("user_id", session.userId)
      .maybeSingle();
    if (vErr || !vp) {
      return apiError("Vendor profile not found", 404);
    }

    const offering = normalizeOfferingArrays(body);

    const { data: row, error } = await supabase
      .from("vendor_services")
      .insert({
        vendor_profile_id: vp.id,
        name: name.trim(),
        description: typeof description === "string" ? description : null,
        service_scope:
          typeof serviceScope === "string" && serviceScope.trim()
            ? serviceScope.trim()
            : null,
        base_price: Math.floor(price),
        max_price:
          typeof maxPrice === "number" && maxPrice > 0
            ? Math.floor(maxPrice)
            : null,
        unit: typeof unit === "string" ? unit : null,
        event_type_fit: offering.eventTypeFit,
        inclusions: offering.inclusions,
        deliverables: offering.deliverables,
        add_ons: offering.addOns,
      })
      .select()
      .single();

    if (error || !row) {
      console.error("vendor_services insert:", error);
      return apiError("Failed to create service", 500);
    }

    const items = normalizeServiceItems(body.items);
    if (items.length > 0) {
      const { error: itemsError } = await supabase
        .from("vendor_service_items")
        .insert(
          items.map((item, index) => ({
            vendor_service_id: row.id,
            item_type: item.itemType,
            name: item.name,
            description: item.description,
            dietary_tags: item.dietaryTags,
            image_urls: item.imageUrls,
            reference_url: item.referenceUrl,
            sort_order: item.sortOrder ?? index,
          }))
        );
      if (itemsError) {
        console.error("vendor_service_items insert:", itemsError);
      }
    }

    const { data: hydrated } = await supabase
      .from("vendor_services")
      .select(
        "*, items:vendor_service_items(id, item_type, name, description, dietary_tags, image_urls, reference_url, sort_order)"
      )
      .eq("id", row.id)
      .maybeSingle();

    return apiSuccess(hydrated ?? row, 201);
  } catch (e) {
    console.error("POST /api/vendor/services", e);
    return apiError("Internal server error", 500);
  }
}
