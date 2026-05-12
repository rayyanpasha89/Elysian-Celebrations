import { NextRequest, NextResponse } from "next/server";
import {
  apiError,
  apiSuccess,
  getAuthSession,
  requireRole,
} from "@/lib/api-utils";
import {
  SavedVendorError,
  addSavedVendorSlug,
  getSavedVendors,
} from "@/lib/saved-vendors";

export async function GET() {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;

  const roleCheck = requireRole(session, "client");
  if (roleCheck) return roleCheck;

  try {
    return apiSuccess(await getSavedVendors(session.userId));
  } catch (error) {
    console.error("Saved vendors load error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;

  const roleCheck = requireRole(session, "client");
  if (roleCheck) return roleCheck;

  try {
    const body = await request.json();
    const slug =
      typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";

    if (!slug) {
      return apiError("Vendor slug is required");
    }

    const savedSlugs = await addSavedVendorSlug(session.userId, slug);

    return apiSuccess(
      { saved: true, slug, savedSlugs },
      201
    );
  } catch (error) {
    console.error("Saved vendors create error:", error);
    if (error instanceof SavedVendorError) {
      return apiError(error.message, error.status);
    }
    return apiError("Internal server error", 500);
  }
}
