import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  getAuthSession,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";
import { slugify } from "@/lib/slug";

function firstRel<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

async function uniqueSlug(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  businessName: string
) {
  const base = slugify(businessName).slice(0, 48) || "vendor";
  for (let i = 0; i < 8; i += 1) {
    const candidate = i === 0 ? base : `${base.slice(0, 44)}-${i + 1}`;
    const { data } = await supabase
      .from("vendor_profiles")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data?.id) return candidate;
  }
  return `${base.slice(0, 40)}-${Date.now().toString(36)}`;
}

export async function GET() {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "admin", "manager");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();

    const [{ data: vendors, error }, { data: categories }, { data: serviceRows }] =
      await Promise.all([
        supabase
          .from("vendor_profiles")
          .select(
            "id, business_name, slug, city, description, rating, is_verified, is_featured, category_id, category:vendor_categories(id, name)"
          )
          .order("created_at", { ascending: false }),
        supabase.from("vendor_categories").select("id, name, slug").order("name"),
        supabase.from("vendor_services").select("vendor_profile_id"),
      ]);

    if (error) {
      console.error("vendor_profiles:", error);
      return apiError("Failed to load vendors", 500);
    }

    const serviceCount = new Map<string, number>();
    for (const s of serviceRows ?? []) {
      const id = s.vendor_profile_id as string | null;
      if (!id) continue;
      serviceCount.set(id, (serviceCount.get(id) ?? 0) + 1);
    }

    const mapped = (vendors ?? []).map((v) => {
      const cat = firstRel(v.category) as { id: string; name: string } | null;
      return {
        id: v.id,
        businessName: v.business_name,
        slug: v.slug,
        city: v.city,
        description: v.description,
        rating: v.rating ?? null,
        isVerified: Boolean(v.is_verified),
        isFeatured: Boolean(v.is_featured),
        categoryId: cat?.id ?? v.category_id ?? null,
        categoryName: cat?.name ?? null,
        serviceCount: serviceCount.get(v.id) ?? 0,
      };
    });

    return apiSuccess({ vendors: mapped, categories: categories ?? [] });
  } catch (e) {
    console.error("GET /api/admin/vendors", e);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "admin", "manager");
  if (roleCheck) return roleCheck;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const businessName =
      typeof body.businessName === "string" ? body.businessName.trim() : "";
    if (!businessName) return apiError("Business name is required", 400);

    const supabase = createAdminSupabaseClient();
    const slug = await uniqueSlug(supabase, businessName);

    const insert: Record<string, unknown> = {
      business_name: businessName,
      slug,
      category_id: typeof body.categoryId === "string" ? body.categoryId : null,
      city: typeof body.city === "string" ? body.city.trim() || null : null,
      description:
        typeof body.description === "string" ? body.description.trim() || null : null,
      is_verified: Boolean(body.isVerified),
      is_featured: Boolean(body.isFeatured),
    };

    const { data, error } = await supabase
      .from("vendor_profiles")
      .insert(insert)
      .select("id, business_name, slug")
      .single();

    if (error || !data) {
      console.error("vendor create:", error);
      return apiError("Failed to create vendor", 500);
    }

    return apiSuccess(
      { vendor: { id: data.id, businessName: data.business_name, slug: data.slug } },
      201
    );
  } catch (e) {
    console.error("POST /api/admin/vendors", e);
    return apiError("Internal server error", 500);
  }
}
