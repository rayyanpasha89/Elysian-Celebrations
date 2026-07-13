import { createAdminSupabaseClient } from "@/lib/supabase/server";

export class SavedVendorError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "SavedVendorError";
    this.status = status;
  }
}

type SavedVendorRow = {
  vendor:
    | {
        id: string;
        slug: string;
        business_name: string | null;
      }
    | {
        id: string;
        slug: string;
        business_name: string | null;
      }[]
    | null;
};

function relationOne<T>(relation: T | T[] | null | undefined) {
  if (Array.isArray(relation)) return relation[0] ?? null;
  return relation ?? null;
}

function normalizeSlug(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

async function getClientProfileId(userId: string) {
  const supabase = createAdminSupabaseClient();
  const { data: profile, error } = await supabase
    .from("client_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return profile?.id ?? null;
}

export async function getSavedVendors(userId: string) {
  const clientProfileId = await getClientProfileId(userId);
  if (!clientProfileId) {
    return { savedSlugs: [], savedVendors: [] };
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("saved_vendors")
    .select("vendor:vendor_profiles(id, slug, business_name)")
    .eq("client_profile_id", clientProfileId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const savedVendors = ((data ?? []) as SavedVendorRow[]).reduce<
    { id: string; slug: string; business_name: string | null }[]
  >((accumulator, row) => {
    const vendor = relationOne(row.vendor);
    if (vendor?.id && vendor.slug) {
      accumulator.push({
        id: vendor.id,
        slug: vendor.slug,
        business_name: vendor.business_name,
      });
    }
    return accumulator;
  }, []);

  return {
    savedSlugs: savedVendors.map((vendor) => vendor.slug),
    savedVendors,
  };
}

export async function getSavedVendorSlugs(userId: string) {
  const { savedSlugs } = await getSavedVendors(userId);
  return savedSlugs;
}

export async function addSavedVendorSlug(userId: string, slug: string) {
  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) {
    throw new SavedVendorError("Vendor slug is required", 400);
  }

  const clientProfileId = await getClientProfileId(userId);
  if (!clientProfileId) {
    throw new SavedVendorError("Complete onboarding before saving vendors", 409);
  }

  const supabase = createAdminSupabaseClient();
  const { data: vendor, error: vendorErr } = await supabase
    .from("vendor_profiles")
    .select("id, slug")
    .eq("slug", normalizedSlug)
    .eq("is_verified", true)
    .maybeSingle();

  if (vendorErr) {
    throw vendorErr;
  }

  if (!vendor?.id || !vendor.slug) {
    throw new SavedVendorError("This vendor is not available to shortlist", 409);
  }

  const { error } = await supabase.from("saved_vendors").upsert(
    {
      client_profile_id: clientProfileId,
      vendor_profile_id: vendor.id,
    },
    {
      onConflict: "client_profile_id,vendor_profile_id",
      ignoreDuplicates: true,
    }
  );

  if (error) {
    throw error;
  }

  return getSavedVendorSlugs(userId);
}

export async function removeSavedVendorSlug(userId: string, slug: string) {
  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) {
    throw new SavedVendorError("Vendor slug is required", 400);
  }

  const clientProfileId = await getClientProfileId(userId);
  if (!clientProfileId) {
    return [];
  }

  const supabase = createAdminSupabaseClient();
  const { data: vendor, error: vendorErr } = await supabase
    .from("vendor_profiles")
    .select("id, slug")
    .eq("slug", normalizedSlug)
    .maybeSingle();

  if (vendorErr) {
    throw vendorErr;
  }

  if (!vendor?.id || !vendor.slug) {
    throw new SavedVendorError("Vendor not found", 404);
  }

  const { error } = await supabase
    .from("saved_vendors")
    .delete()
    .eq("client_profile_id", clientProfileId)
    .eq("vendor_profile_id", vendor.id);

  if (error) {
    throw error;
  }

  return getSavedVendorSlugs(userId);
}
