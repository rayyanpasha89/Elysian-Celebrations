import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  getAuthSession,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";
import { buildVendorProfileSeed } from "@/lib/vendor-profile";
import { deleteVendorMediaImage } from "@/lib/supabase/storage";
import type { Database } from "@/types/database.types";

type VendorProfileInsert =
  Database["public"]["Tables"]["vendor_profiles"]["Insert"];
type VendorProfileUpdate =
  Database["public"]["Tables"]["vendor_profiles"]["Update"];

const MAX_PORTFOLIO_IMAGES = 12;

function normalizeImageUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2_000) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    const isSeedImage = url.hostname === "images.unsplash.com";
    const isVendorMedia =
      url.hostname.endsWith(".supabase.co") &&
      url.pathname.startsWith("/storage/v1/object/public/vendor-media/");
    return isSeedImage || isVendorMedia ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizePortfolio(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > MAX_PORTFOLIO_IMAGES) return null;

  const urls = value.map(normalizeImageUrl);
  if (urls.some((url) => url === null)) return null;

  return Array.from(new Set(urls as string[]));
}

export async function GET() {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "vendor");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();
    // Category choices and the signed-in vendor profile are independent.
    // Keep this route to one round-trip window instead of making the editor
    // wait for the category query before it can load existing data.
    const [{ data: cats }, { data: vp, error }] = await Promise.all([
      supabase
        .from("vendor_categories")
        .select("id, name, slug")
        .order("sort_order", { ascending: true }),
      supabase
        .from("vendor_profiles")
        .select(
          `id, business_name, short_bio, city, state, country, experience, cover_image, portfolio,
          category:vendor_categories(id, name, slug)`
        )
        .eq("user_id", session.userId)
        .maybeSingle(),
    ]);

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
        coverImage: vp.cover_image ?? null,
        portfolio: vp.portfolio ?? [],
      },
    });
  } catch (e) {
    console.error("GET /api/vendor/profile", e);
    return apiError("Internal server error", 500);
  }
}

/**
 * Persists media URLs returned from the authenticated upload route. The UI
 * never needs direct Storage write access, and removed bucket files are
 * cleaned up only after the database update succeeds.
 */
export async function PATCH(request: NextRequest) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "vendor");
  if (roleCheck) return roleCheck;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const hasCover = Object.hasOwn(body, "coverImage");
    const hasPortfolio = Object.hasOwn(body, "portfolio");
    if (!hasCover && !hasPortfolio) {
      return apiError("No media changes supplied", 400);
    }

    const supabase = createAdminSupabaseClient();
    const { data: profile, error: profileErr } = await supabase
      .from("vendor_profiles")
      .select("id, cover_image, portfolio")
      .eq("user_id", session.userId)
      .maybeSingle();

    if (profileErr) {
      console.error("vendor_profiles media:", profileErr);
      return apiError("Failed to load profile", 500);
    }
    if (!profile) {
      return apiError("Save your business profile before adding imagery", 409);
    }

    let coverImage = profile.cover_image ?? null;
    if (hasCover) {
      if (body.coverImage === null) {
        coverImage = null;
      } else {
        coverImage = normalizeImageUrl(body.coverImage);
        if (!coverImage) return apiError("Invalid cover image URL", 400);
      }
    }

    let portfolio = Array.isArray(profile.portfolio) ? profile.portfolio : [];
    if (hasPortfolio) {
      const normalized = normalizePortfolio(body.portfolio);
      if (!normalized) {
        return apiError(`Portfolio must contain at most ${MAX_PORTFOLIO_IMAGES} valid images`, 400);
      }
      portfolio = normalized;
    }

    const mediaUpdate: VendorProfileUpdate = {
      cover_image: coverImage,
      portfolio,
    };
    const { error: updateErr } = await supabase
      .from("vendor_profiles")
      .update(mediaUpdate)
      .eq("id", profile.id);
    if (updateErr) {
      console.error("vendor_profiles media update:", updateErr);
      return apiError("Failed to save media", 500);
    }

    const previousUrls = [
      ...(profile.cover_image ? [profile.cover_image] : []),
      ...(Array.isArray(profile.portfolio) ? profile.portfolio : []),
    ];
    const retainedUrls = new Set([
      ...(coverImage ? [coverImage] : []),
      ...portfolio,
    ]);
    await Promise.all(
      previousUrls
        .filter((url) => !retainedUrls.has(url))
        .map((url) => deleteVendorMediaImage(url, profile.id))
    );

    return apiSuccess({ coverImage, portfolio });
  } catch (e) {
    console.error("PATCH /api/vendor/profile", e);
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

      const profileInsert: VendorProfileInsert = {
        user_id: session.userId,
        ...seed,
        short_bio: typeof shortBio === "string" ? shortBio : null,
        city: typeof city === "string" ? city : null,
        state: typeof state === "string" ? state : null,
        experience:
          typeof experience === "number" && !Number.isNaN(experience)
            ? Math.max(0, Math.floor(experience))
            : null,
      };
      const { error: insertErr } = await supabase
        .from("vendor_profiles")
        .insert(profileInsert);

      if (insertErr) {
        console.error("vendor_profiles insert:", insertErr);
        return apiError("Failed to create profile", 500);
      }

      return apiSuccess({ ok: true, created: true }, 201);
    }

    const updates: VendorProfileUpdate = {};
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
