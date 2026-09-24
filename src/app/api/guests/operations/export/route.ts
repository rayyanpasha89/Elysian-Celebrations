import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthSession, requireRole } from "@/lib/api-utils";
import { getClientProfileId } from "@/lib/guest-access";
import {
  guestOperationsManifestCsv,
  loadGuestOperationsManifest,
} from "@/lib/guest-operations-export";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

function fileName(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return `${slug || "event"}-guest-operations.csv`;
}

export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "client");
  if (roleCheck) return roleCheck;

  const weddingId = request.nextUrl.searchParams.get("weddingId")?.trim() ?? "";
  if (!weddingId) return apiError("Choose an event", 400);

  try {
    const supabase = createAdminSupabaseClient();
    const profileId = await getClientProfileId(supabase, session.userId);
    if (!profileId) return apiError("Client profile not found", 404);

    const manifest = await loadGuestOperationsManifest(
      supabase,
      weddingId,
      profileId
    );
    if (!manifest) return apiError("Event not found", 404);

    return new NextResponse(guestOperationsManifestCsv(manifest), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName(manifest.event.name)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Guest operations export error:", error);
    return apiError("Failed to export guest operations", 500);
  }
}
