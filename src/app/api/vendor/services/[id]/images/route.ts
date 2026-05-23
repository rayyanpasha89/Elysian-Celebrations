import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  getAuthSession,
  requireRole,
} from "@/lib/api-utils";
import { uploadVendorServiceImage } from "@/lib/supabase/storage";

// 8 MB safety cap (mirrors the helper). Keep here too so a giant body never
// even makes it into memory if the route receives a stream above the limit.
const MAX_REQUEST_BYTES = 9 * 1024 * 1024;

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "vendor");
  if (roleCheck) return roleCheck;

  const { id: vendorServiceId } = await ctx.params;
  if (!vendorServiceId) return apiError("Invalid service id", 400);

  // Cheap content-length sanity check; multipart files exceeding this are
  // bounced before we touch storage.
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_REQUEST_BYTES) {
    return apiError("Upload exceeds size limit", 413);
  }

  try {
    const supabase = createAdminSupabaseClient();

    // Owner gate: the vendor profile attached to the session must own the
    // service. We re-query rather than trust client-supplied ids.
    const { data: vendorProfile, error: vendorErr } = await supabase
      .from("vendor_profiles")
      .select("id")
      .eq("user_id", session.userId)
      .maybeSingle();
    if (vendorErr || !vendorProfile) {
      return apiError("Vendor profile not found", 404);
    }

    const { data: service, error: serviceErr } = await supabase
      .from("vendor_services")
      .select("id")
      .eq("id", vendorServiceId)
      .eq("vendor_profile_id", vendorProfile.id)
      .maybeSingle();
    if (serviceErr || !service) {
      return apiError("Service not found", 404);
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      return apiError("Missing file in form data", 400);
    }

    const result = await uploadVendorServiceImage({
      file,
      vendorProfileId: vendorProfile.id,
      vendorServiceId,
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

    return apiSuccess(
      {
        url: result.data.url,
        path: result.data.path,
        contentType: result.data.contentType,
        size: result.data.size,
      },
      201
    );
  } catch (err) {
    console.error("POST /api/vendor/services/[id]/images", err);
    return apiError("Internal server error", 500);
  }
}
