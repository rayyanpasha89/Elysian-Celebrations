import { createAdminSupabaseClient } from "@/lib/supabase/server";

/**
 * Bucket used for vendor catalogue imagery — public read, server-side write only.
 *
 * Naming convention for paths:
 *   `service-items/{vendor_profile_id}/{vendor_service_id}/{uuid}.{ext}`
 *   `profiles/{vendor_profile_id}/{uuid}.{ext}`
 *
 * Keeping the prefix structure makes it trivial to:
 *   - audit one vendor's storage usage
 *   - cascade-delete on vendor offboarding
 *   - migrate to private+signed-URL later without touching the URL shape
 */
export const VENDOR_MEDIA_BUCKET = "vendor-media";

const MAX_BYTES = 4 * 1024 * 1024; // Leaves multipart overhead below Vercel's 4.5 MB request cap.
export const VENDOR_MEDIA_QUOTA_BYTES = 100 * 1024 * 1024; // 100 MB per vendor
const ALLOWED_MIME_PREFIXES = ["image/jpeg", "image/png", "image/webp"];

let bucketEnsuredAt = 0;
const BUCKET_TTL_MS = 5 * 60_000;

/**
 * Lazy idempotent bucket creation. Cached in memory so the round-trip happens
 * at most once per 5 minutes per warm Lambda. Returns true if the bucket is
 * usable; false if creation failed and the caller should bail.
 */
export async function ensureVendorMediaBucket(): Promise<boolean> {
  if (Date.now() - bucketEnsuredAt < BUCKET_TTL_MS) return true;
  const supabase = createAdminSupabaseClient();

  const { data: existing, error: getErr } =
    await supabase.storage.getBucket(VENDOR_MEDIA_BUCKET);
  if (existing) {
    bucketEnsuredAt = Date.now();
    return true;
  }
  // Only treat "not found" as a signal to create; other errors should fail loud.
  if (getErr && !/not\s*found/i.test(getErr.message)) {
    console.error("vendor-media bucket lookup failed:", getErr);
    return false;
  }

  const { error: createErr } = await supabase.storage.createBucket(
    VENDOR_MEDIA_BUCKET,
    {
      public: true,
      fileSizeLimit: MAX_BYTES,
      allowedMimeTypes: ALLOWED_MIME_PREFIXES,
    }
  );
  if (createErr) {
    console.error("vendor-media bucket create failed:", createErr);
    return false;
  }
  bucketEnsuredAt = Date.now();
  return true;
}

export type StoredImage = {
  url: string;
  path: string;
  contentType: string;
  size: number;
};

export type UploadError = {
  code:
    | "invalid-type"
    | "too-large"
    | "quota-exceeded"
    | "no-file"
    | "upload-failed";
  message: string;
};

async function reserveVendorMediaBytes(
  vendorProfileId: string,
  bytes: number
): Promise<
  | { status: "reserved"; reservationId: string }
  | { status: "quota-exceeded" }
  | { status: "unavailable" }
> {
  const reservationId = crypto.randomUUID();
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.rpc("reserve_vendor_media_bytes", {
    p_bytes: bytes,
    p_quota_bytes: VENDOR_MEDIA_QUOTA_BYTES,
    p_reservation_id: reservationId,
    p_vendor_profile_id: vendorProfileId,
  });
  if (error) {
    console.error("vendor-media quota reservation failed:", error);
    return { status: "unavailable" };
  }

  const result = data?.[0];
  if (!result) return { status: "unavailable" };
  return result.allowed
    ? { status: "reserved", reservationId }
    : { status: "quota-exceeded" };
}

async function releaseVendorMediaBytes(
  vendorProfileId: string,
  reservationId: string
) {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.rpc("release_vendor_media_bytes", {
    p_reservation_id: reservationId,
    p_vendor_profile_id: vendorProfileId,
  });
  if (error) {
    // Reservations expire automatically. A failed release can temporarily
    // block uploads, but it can never let the quota be exceeded.
    console.error("vendor-media quota release failed:", error);
  }
}

function extensionFor(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

async function uploadVendorImage({
  file,
  pathPrefix,
  vendorProfileId,
}: {
  file: File | Blob;
  pathPrefix: string;
  vendorProfileId: string;
}): Promise<{ ok: true; data: StoredImage } | { ok: false; error: UploadError }> {
  if (!file) {
    return { ok: false, error: { code: "no-file", message: "No file received" } };
  }
  const mime = (file as File).type ?? "";
  if (!ALLOWED_MIME_PREFIXES.includes(mime)) {
    return {
      ok: false,
      error: {
        code: "invalid-type",
        message: "Only JPEG, PNG, or WebP images are accepted",
      },
    };
  }
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      error: {
        code: "too-large",
        message: `File exceeds the ${MAX_BYTES / (1024 * 1024)} MB limit`,
      },
    };
  }

  const ready = await ensureVendorMediaBucket();
  if (!ready) {
    return {
      ok: false,
      error: {
        code: "upload-failed",
        message: "Storage bucket is unavailable",
      },
    };
  }

  const reservation = await reserveVendorMediaBytes(vendorProfileId, file.size);
  if (reservation.status === "unavailable") {
    return {
      ok: false,
      error: {
        code: "upload-failed",
        message: "Could not verify your media storage allowance",
      },
    };
  }
  if (reservation.status === "quota-exceeded") {
    return {
      ok: false,
      error: {
        code: "quota-exceeded",
        message: "Vendor media storage is limited to 100 MB",
      },
    };
  }

  try {
    const ext = extensionFor(mime);
    const filename = `${crypto.randomUUID()}.${ext}`;
    const path = `${pathPrefix}/${filename}`;
    const supabase = createAdminSupabaseClient();
    const buffer = Buffer.from(await (file as Blob).arrayBuffer());
    const { error: uploadErr } = await supabase.storage
      .from(VENDOR_MEDIA_BUCKET)
      .upload(path, buffer, {
        contentType: mime,
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadErr) {
      console.error("vendor-media upload failed:", uploadErr);
      return {
        ok: false,
        error: {
          code: "upload-failed",
          message: uploadErr.message || "Upload failed",
        },
      };
    }

    const { data } = supabase.storage
      .from(VENDOR_MEDIA_BUCKET)
      .getPublicUrl(path);

    return {
      ok: true,
      data: {
        url: data.publicUrl,
        path,
        contentType: mime,
        size: file.size,
      },
    };
  } finally {
    await releaseVendorMediaBytes(vendorProfileId, reservation.reservationId);
  }
}

/**
 * Upload a single catalogue image beneath the service it belongs to. The
 * scoped path gives us safe ownership checks and targeted cleanup later.
 */
export async function uploadVendorServiceImage({
  file,
  vendorProfileId,
  vendorServiceId,
}: {
  file: File | Blob;
  vendorProfileId: string;
  vendorServiceId: string;
}): Promise<{ ok: true; data: StoredImage } | { ok: false; error: UploadError }> {
  return uploadVendorImage({
    file,
    pathPrefix: `service-items/${vendorProfileId}/${vendorServiceId}`,
    vendorProfileId,
  });
}

/**
 * Upload a cover or portfolio image for a vendor profile. Profile media is
 * kept separate from item imagery so replacing a catalogue never affects the
 * vendor's wider visual identity.
 */
export async function uploadVendorProfileImage({
  file,
  vendorProfileId,
}: {
  file: File | Blob;
  vendorProfileId: string;
}): Promise<{ ok: true; data: StoredImage } | { ok: false; error: UploadError }> {
  return uploadVendorImage({
    file,
    pathPrefix: `profiles/${vendorProfileId}`,
    vendorProfileId,
  });
}

function getVendorMediaPath(publicUrl: string): string | null {
  const url = new URL(publicUrl);
  const marker = `/storage/v1/object/public/${VENDOR_MEDIA_BUCKET}/`;
  if (!url.pathname.startsWith(marker)) return null;

  return decodeURIComponent(url.pathname.slice(marker.length));
}

function isDirectChild(path: string, ownedPrefix: string): boolean {
  const prefix = `${ownedPrefix}/`;
  if (!path.startsWith(prefix)) return false;

  const filename = path.slice(prefix.length);
  return filename.length > 0 && !filename.includes("/");
}

/**
 * Best-effort cleanup for a path owned by the authenticated vendor. The exact
 * upload prefix is checked before creating an admin client so copied URLs can
 * never authorize cross-vendor or cross-service deletion.
 */
async function deleteOwnedVendorMediaImage(
  publicUrl: string,
  ownedPrefix: string
): Promise<void> {
  try {
    const path = getVendorMediaPath(publicUrl);
    if (!path || !isDirectChild(path, ownedPrefix)) return;

    const supabase = createAdminSupabaseClient();
    const { error } = await supabase.storage
      .from(VENDOR_MEDIA_BUCKET)
      .remove([path]);
    if (error) {
      console.error("vendor-media delete failed:", error);
    }
  } catch (err) {
    console.error("vendor-media delete parse failed:", err);
  }
}

export async function deleteVendorMediaImage(
  publicUrl: string,
  vendorProfileId: string
): Promise<void> {
  return deleteOwnedVendorMediaImage(
    publicUrl,
    `profiles/${vendorProfileId}`
  );
}

export async function deleteVendorServiceImage(
  publicUrl: string,
  vendorProfileId: string,
  vendorServiceId: string
): Promise<void> {
  return deleteOwnedVendorMediaImage(
    publicUrl,
    `service-items/${vendorProfileId}/${vendorServiceId}`
  );
}
