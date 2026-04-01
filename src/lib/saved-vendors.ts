import { clerkClient } from "@clerk/nextjs/server";

const METADATA_KEY = "savedVendorSlugs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeSlug(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeSavedVendorSlugs(value: unknown) {
  if (!Array.isArray(value)) return [];

  return [...new Set(value.map(normalizeSlug).filter(Boolean))];
}

export async function getSavedVendorSlugs(userId: string) {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  return normalizeSavedVendorSlugs(
    isRecord(user.privateMetadata) ? user.privateMetadata[METADATA_KEY] : undefined
  );
}

export async function setSavedVendorSlugs(userId: string, slugs: string[]) {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const privateMetadata = isRecord(user.privateMetadata)
    ? user.privateMetadata
    : {};

  const nextSlugs = normalizeSavedVendorSlugs(slugs);

  await client.users.updateUser(userId, {
    privateMetadata: {
      ...privateMetadata,
      [METADATA_KEY]: nextSlugs,
    },
  });

  return nextSlugs;
}

export async function addSavedVendorSlug(userId: string, slug: string) {
  const current = await getSavedVendorSlugs(userId);
  return setSavedVendorSlugs(userId, [...current, slug]);
}

export async function removeSavedVendorSlug(userId: string, slug: string) {
  const normalizedSlug = normalizeSlug(slug);
  const current = await getSavedVendorSlugs(userId);
  return setSavedVendorSlugs(
    userId,
    current.filter((entry) => entry !== normalizedSlug)
  );
}
