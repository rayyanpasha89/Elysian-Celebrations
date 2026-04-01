import { NextResponse } from "next/server";
import {
  apiError,
  apiSuccess,
  getAuthSession,
  requireRole,
} from "@/lib/api-utils";
import {
  bootstrapCloudTestingData,
  getCloudBootstrapPassword,
} from "@/lib/testing/cloud-bootstrap";

export async function POST() {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;

  const roleCheck = requireRole(session, "admin");
  if (roleCheck) return roleCheck;

  if (process.env.ENABLE_TEST_DATA_BOOTSTRAP !== "true") {
    return apiError("Test data bootstrap is disabled in this environment.", 403);
  }

  try {
    const summary = await bootstrapCloudTestingData();

    return apiSuccess({
      ...summary,
      testPassword: getCloudBootstrapPassword(),
    });
  } catch (error) {
    console.error("POST /api/admin/testing/bootstrap", error);
    return apiError("Failed to bootstrap cloud testing data", 500);
  }
}
