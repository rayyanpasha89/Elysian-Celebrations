import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  getAuthSession,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";
import { buildVendorProfileSeed } from "@/lib/vendor-profile";

export async function GET() {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "vendor");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();
    const { data: cats } = await supabase
      .from("vendor_categories")
      .select("id, name, slug")
      .order("sort_order", { ascending: true });

    const { data: vp, error } = await supabase
      .from("vendor_profiles")
      .select(
        `id, business_name, short_bio, city, state, country, experience,
        category:vendor_categories(id, name, slug)`
      )
      .eq("user_id", session.userId)
      .maybeSingle();

    if (error) {
      console.error("vendor_profiles:", error);
      return apiError("Failed to load profile", 500);
    }
    if (!vp) {
      return apiSuccess({ profile: null, categories: cats ?? [] });
    }

    const cat = vp.category as { id?: string; name?: string; slug?: string } | null;

    return apiSuccess({
      categories: cats ?? [],
      profile: {
        id: vp.id,
        businessName: vp.business_name,
        categoryId: cat?.id ?? null,
        categoryName: cat?.name ?? "",
        categorySlug: cat?.slug ?? "",
        shortBio: vp.short_bio ?? "",
        city: vp.city ?? "",
        state: vp.state ?? "",
        country: vp.country ?? "",
        experience: vp.experience ?? 0,
      },
    });
  } catch (e) {
    console.error("GET /api/vendor/profile", e);
    return apiError("Internal server error", 500);
  }
}

export async function PUT(request: NextRequest) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "vendor");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();
    const body = await request.json();
    const {
      businessName,
      categoryId,
      shortBio,
      city,
      state,
      experience,
    } = body as Record<string, unknown>;

    const normalizedName =
      typeof businessName === "string" ? businessName.trim() : "";
    const requestedCategoryId =
      typeof categoryId === "string" && categoryId ? categoryId : undefined;

    const { data: vp, error: vErr } = await supabase
      .from("vendor_profiles")
      .select("id")
      .eq("user_id", session.userId)
      .maybeSingle();

    if (vErr) {
      console.error("vendor_profiles:", vErr);
      return apiError("Failed to load profile", 500);
    }
    if (!vp) {
      if (!normalizedName) {
        return apiError("Business name is required");
      }

      const seed = await buildVendorProfileSeed(supabase, {
        businessName: normalizedName,
        userId: session.userId,
        categoryId: requestedCategoryId,
      });

      const { error: insertErr } = await supabase.from("vendor_profiles").insert({
        user_id: session.userId,
        ...seed,
        short_bio: typeof shortBio === "string" ? shortBio : null,
        city: typeof city === "string" ? city : null,
        state: typeof state === "string" ? state : null,
        experience:
          typeof experience === "number" && !Number.isNaN(experience)
            ? Math.max(0, Math.floor(experience))
            : null,
      });

      if (insertErr) {
        console.error("vendor_profiles insert:", insertErr);
        return apiError("Failed to create profile", 500);
      }

      return apiSuccess({ ok: true, created: true }, 201);
    }

    const updates: Record<string, unknown> = {};
    if (typeof businessName === "string") updates.business_name = normalizedName;
    if (typeof shortBio === "string") updates.short_bio = shortBio;
    if (typeof city === "string") updates.city = city;
    if (typeof state === "string") updates.state = state;
    if (typeof experience === "number" && !Number.isNaN(experience)) {
      updates.experience = Math.max(0, Math.floor(experience));
    }
    if (requestedCategoryId) {
      updates.category_id = requestedCategoryId;
    }

    const { error: uErr } = await supabase
      .from("vendor_profiles")
      .update(updates)
      .eq("id", vp.id);

    if (uErr) {
      console.error("vendor_profiles update:", uErr);
      return apiError("Failed to save profile", 500);
    }

    return apiSuccess({ ok: true, created: false });
  } catch (e) {
    console.error("PUT /api/vendor/profile", e);
    return apiError("Internal server error", 500);
  }
}
