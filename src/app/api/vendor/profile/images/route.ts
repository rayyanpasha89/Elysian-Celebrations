import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  getAuthSession,
  requireRole,
} from "@/lib/api-utils";
import { uploadVendorProfileImage } from "@/lib/supabase/storage";

const MAX_REQUEST_BYTES = 9 * 1024 * 1024;

/** Uploads one vendor-owned cover or portfolio image. */
export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "vendor");
  if (roleCheck) return roleCheck;

  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_REQUEST_BYTES) {
    return apiError("Upload exceeds size limit", 413);
  }

  try {
    const supabase = createAdminSupabaseClient();
    const { data: vendorProfile, error: vendorErr } = await supabase
      .from("vendor_profiles")
      .select("id")
      .eq("user_id", session.userId)
      .maybeSingle();
    if (vendorErr || !vendorProfile) {
      return apiError("Save your business profile before adding imagery", 409);
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      return apiError("Missing file in form data", 400);
    }

    const result = await uploadVendorProfileImage({
      file,
      vendorProfileId: vendorProfile.id,
    });
    if (!result.ok) {
      const status =
        result.error.code === "invalid-type"
          ? 415
          : result.error.code === "too-large"
            ? 413
            : result.error.code === "no-file"
              ? 400
              : 500;
      return apiError(result.error.message, status);
    }

    return apiSuccess(result.data, 201);
  } catch (err) {
    console.error("POST /api/vendor/profile/images", err);
    return apiError("Internal server error", 500);
  }
}
