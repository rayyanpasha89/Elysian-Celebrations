import { createAdminSupabaseClient } from "@/lib/supabase/server";

/**
 * Bucket used for vendor catalogue imagery — public read, server-side write only.
 *
 * Naming convention for paths:
 *   `service-items/{vendor_profile_id}/{vendor_service_id}/{uuid}.{ext}`
 *
 * Keeping the prefix structure makes it trivial to:
 *   - audit one vendor's storage usage
 *   - cascade-delete on vendor offboarding
 *   - migrate to private+signed-URL later without touching the URL shape
 */
export const VENDOR_MEDIA_BUCKET = "vendor-media";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
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
  code: "invalid-type" | "too-large" | "no-file" | "upload-failed";
  message: string;
};

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

/**
 * Upload a single image File to the vendor-media bucket under the given
 * `vendorProfileId / vendorServiceId` prefix. Validates mime + size before
 * touching storage so callers can return clean 400s.
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

  const ext = extensionFor(mime);
  // Crypto.randomUUID is available on Node 18+ which Next 15 ships against.
  const filename = `${crypto.randomUUID()}.${ext}`;
  const path = `service-items/${vendorProfileId}/${vendorServiceId}/${filename}`;

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
}

/**
 * Best-effort cleanup. Caller passes the public URL we returned earlier; we
 * derive the storage path and remove. Failures are logged but not thrown —
 * orphan media is preferable to a save failure.
 */
export async function deleteVendorServiceImage(publicUrl: string): Promise<void> {
  try {
    const url = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${VENDOR_MEDIA_BUCKET}/`;
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return;
    const path = url.pathname.slice(idx + marker.length);
    if (!path.startsWith("service-items/")) return;
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
