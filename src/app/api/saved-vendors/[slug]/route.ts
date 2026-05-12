import { NextRequest, NextResponse } from "next/server";
import {
  apiError,
  apiSuccess,
  getAuthSession,
  requireRole,
} from "@/lib/api-utils";
import { SavedVendorError, removeSavedVendorSlug } from "@/lib/saved-vendors";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;

  const roleCheck = requireRole(session, "client");
  if (roleCheck) return roleCheck;

  try {
    const { slug } = await params;
    const normalizedSlug = slug.trim().toLowerCase();

    if (!normalizedSlug) {
      return apiError("Vendor slug is required");
    }

    const savedSlugs = await removeSavedVendorSlug(session.userId, normalizedSlug);

    return apiSuccess({
      saved: false,
      slug: normalizedSlug,
      savedSlugs,
    });
  } catch (error) {
    console.error("Saved vendors delete error:", error);
    if (error instanceof SavedVendorError) {
      return apiError(error.message, error.status);
    }
    return apiError("Internal server error", 500);
  }
}
