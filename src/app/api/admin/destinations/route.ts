import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  getAuthSession,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";
import { slugify } from "@/lib/slug";

const DESTINATION_COLUMNS =
  "id, name, slug, country, tagline, starting_price, venue_count, is_active, sort_order";
const MAX_INTEGER = 2_147_483_647;
const MAX_NAME_LENGTH = 120;
const MAX_COUNTRY_LENGTH = 80;
const MAX_TAGLINE_LENGTH = 240;

type DestinationPayload = Record<string, unknown>;

async function createUniqueSlug(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  value: string
) {
  const base = slugify(value).slice(0, 88);

  for (let suffix = 1; suffix <= 20; suffix += 1) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`;
    const { data, error } = await supabase
      .from("destinations")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (error) throw error;
    if (!data) return candidate;
  }

  return `${base}-${Date.now().toString(36)}`;
}

export async function GET() {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "admin");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();
    const { data: rows, error } = await supabase
      .from("destinations")
      .select(`${DESTINATION_COLUMNS}, created_at`)
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

  let body: DestinationPayload;
  try {
    const payload: unknown = await request.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return apiError("Request body must be a JSON object", 400);
    }
    body = payload as DestinationPayload;
  } catch {
    return apiError("Request body must be valid JSON", 400);
  }

  try {
    const supabase = createAdminSupabaseClient();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const country = typeof body.country === "string" ? body.country.trim() : "";

    if (!name || !country) {
      return apiError("Name and country are required", 400);
    }
    if (name.length > MAX_NAME_LENGTH) {
      return apiError(`Name must be ${MAX_NAME_LENGTH} characters or fewer`, 400);
    }
    if (country.length > MAX_COUNTRY_LENGTH) {
      return apiError(`Country must be ${MAX_COUNTRY_LENGTH} characters or fewer`, 400);
    }

    if (
      body.tagline !== undefined &&
      body.tagline !== null &&
      typeof body.tagline !== "string"
    ) {
      return apiError("Tagline must be text", 400);
    }
    const tagline =
      typeof body.tagline === "string" ? body.tagline.trim() || null : null;
    if (tagline && tagline.length > MAX_TAGLINE_LENGTH) {
      return apiError(`Tagline must be ${MAX_TAGLINE_LENGTH} characters or fewer`, 400);
    }

    let startingPrice: number | null = null;
    if (body.startingPrice !== undefined && body.startingPrice !== null) {
      if (
        typeof body.startingPrice !== "number" ||
        !Number.isInteger(body.startingPrice) ||
        body.startingPrice <= 0 ||
        body.startingPrice > MAX_INTEGER
      ) {
        return apiError("Starting price must be a positive whole number of rupees", 400);
      }
      startingPrice = body.startingPrice;
    }

    const [slug, orderResult] = await Promise.all([
      createUniqueSlug(supabase, name),
      supabase
        .from("destinations")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1),
    ]);

    if (orderResult.error) throw orderResult.error;
    const nextOrder = (orderResult.data?.[0]?.sort_order ?? -1) + 1;

    const { data: row, error } = await supabase
      .from("destinations")
      .insert({
        name,
        slug,
        country,
        tagline,
        starting_price: startingPrice,
        is_active: true,
        sort_order: nextOrder,
      })
      .select(DESTINATION_COLUMNS)
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
