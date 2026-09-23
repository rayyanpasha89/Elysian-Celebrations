import { NextResponse } from "next/server";
import { apiError, apiSuccess, getAuthSession, requireRole } from "@/lib/api-utils";
import { loadOperationsEventList } from "@/lib/operations-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "manager", "admin");
  if (roleCheck) return roleCheck;

  try {
    return apiSuccess(await loadOperationsEventList(session));
  } catch (error) {
    console.error("GET /api/operations/events:", error);
    return apiError("Operations events could not be loaded", 500);
  }
}

