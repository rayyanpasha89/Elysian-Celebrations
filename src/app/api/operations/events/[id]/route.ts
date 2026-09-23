import { NextRequest, NextResponse } from "next/server";
import { apiError, apiSuccess, getAuthSession, requireRole } from "@/lib/api-utils";
import { loadOperationsWorkspace } from "@/lib/operations-server";

export const dynamic = "force-dynamic";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}

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

