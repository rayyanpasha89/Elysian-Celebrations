import { createAdminSupabaseClient } from "@/lib/supabase/server";

type AdminClient = ReturnType<typeof createAdminSupabaseClient>;

function slugifyVendorName(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug.slice(0, 42) || "vendor";
}

async function resolveVendorCategoryId(
  supabase: AdminClient,
  requestedCategoryId?: string
): Promise<string | null> {
  if (requestedCategoryId) {
    const { data, error } = await supabase
      .from("vendor_categories")
      .select("id")
      .eq("id", requestedCategoryId)
      .maybeSingle();

    if (!error && data?.id) {
      return data.id;
    }
  }

  const { data, error } = await supabase
    .from("vendor_categories")
    .select("id")
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data?.id) {
    return null;
  }

  return data.id;
}

async function createUniqueVendorSlug(
  supabase: AdminClient,
  businessName: string,
  userId: string
): Promise<string> {
  const base = slugifyVendorName(businessName);

  for (let i = 0; i < 6; i += 1) {
    const suffix = i === 0 ? "" : `-${i + 1}`;
    const candidate = `${base.slice(0, Math.max(1, 48 - suffix.length))}${suffix}`;

    const { data, error } = await supabase
      .from("vendor_profiles")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data?.id) {
      return candidate;
    }
  }

  return `${base.slice(0, 34)}-${userId.slice(-6).toLowerCase()}`;
}

export async function buildVendorProfileSeed(
  supabase: AdminClient,
  {
    businessName,
    userId,
    categoryId,
  }: {
    businessName: string;
    userId: string;
    categoryId?: string;
  }
) {
  const normalizedName = businessName.trim() || "Unnamed Vendor";
  const resolvedCategoryId = await resolveVendorCategoryId(supabase, categoryId);

  if (!resolvedCategoryId) {
    throw new Error("No vendor categories configured");
  }

  const slug = await createUniqueVendorSlug(supabase, normalizedName, userId);

  return {
    business_name: normalizedName,
    slug,
    category_id: resolvedCategoryId,
  };
}
