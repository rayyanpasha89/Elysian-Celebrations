import { NextRequest, NextResponse } from "next/server";
import { apiError, apiSuccess, getAuthSession, requireRole } from "@/lib/api-utils";
import { isUuid } from "@/lib/id-utils";
import { loadOperationsWorkspace } from "@/lib/operations-server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "manager", "admin");
  if (roleCheck) return roleCheck;
  const { id } = await params;
  if (!isUuid(id)) return apiError("Invalid event", 400);

  try {
    const workspace = await loadOperationsWorkspace(session, id);
    if (!workspace) return apiError("Event not found", 404);
    return apiSuccess(workspace);
  } catch (error) {
    console.error("GET /api/operations/events/[id]:", error);
    return apiError("Operations workspace could not be loaded", 500);
  }
}
