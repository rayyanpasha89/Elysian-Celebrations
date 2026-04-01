import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  getAuthSession,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";
import { slugify } from "@/lib/slug";

export async function GET() {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "admin");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();
    const { data: rows, error } = await supabase
      .from("destinations")
      .select(
        "id, name, slug, country, tagline, starting_price, venue_count, is_active, sort_order, created_at"
      )
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("destinations:", error);
      return apiError("Failed to load destinations", 500);
    }

    return apiSuccess({ destinations: rows ?? [] });
  } catch (e) {
    console.error("GET /api/admin/destinations", e);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "admin");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();
    const body = (await request.json()) as {
      name?: string;
      country?: string;
      slug?: string;
      tagline?: string;
      startingPrice?: number;
    };

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const country =
      typeof body.country === "string" && body.country.trim()
        ? body.country.trim()
        : "";
    if (!name || !country) {
      return apiError("Name and country are required");
    }

    const baseSlug =
      typeof body.slug === "string" && body.slug.trim()
        ? slugify(body.slug.trim())
        : slugify(name);

    const { data: existing } = await supabase
      .from("destinations")
      .select("id")
      .eq("slug", baseSlug)
      .maybeSingle();

    let slug = baseSlug;
    if (existing) {
      slug = `${baseSlug}-${Date.now().toString(36)}`;
    }

    const { data: maxRows } = await supabase
      .from("destinations")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1);

    const nextOrder = (maxRows?.[0]?.sort_order ?? 0) + 1;

    const startingPrice =
      typeof body.startingPrice === "number" && body.startingPrice > 0
        ? Math.floor(body.startingPrice)
        : null;

    const { data: row, error } = await supabase
      .from("destinations")
      .insert({
        name,
        slug,
        country,
        tagline:
          typeof body.tagline === "string" && body.tagline.trim()
            ? body.tagline.trim()
            : null,
        starting_price: startingPrice,
        is_active: true,
        sort_order: nextOrder,
      })
      .select()
      .single();

    if (error) {
      console.error("destinations insert:", error);
      if (error.code === "23505") {
        return apiError("A destination with this name or slug already exists", 409);
      }
      return apiError("Failed to create destination", 500);
    }

    return apiSuccess({ destination: row }, 201);
  } catch (e) {
    console.error("POST /api/admin/destinations", e);
    return apiError("Internal server error", 500);
  }
}
