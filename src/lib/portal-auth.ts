import "server-only";

import { forbidden, redirect } from "next/navigation";
import type { UserRole } from "@/lib/auth-types";
import {
  getAuthSessionState,
  type AuthSession,
} from "@/lib/api-utils";
import { portalPathForRole } from "@/lib/role-utils";

export async function requirePortalPageRole(
  requestedPath: string,
  ...allowedRoles: UserRole[]
): Promise<AuthSession> {
  const result = await getAuthSessionState();

  if (result.state === "unauthenticated") {
    redirect(`/login?redirect_url=${encodeURIComponent(requestedPath)}`);
  }
  if (result.state === "inactive") forbidden();
  if (result.state === "unavailable") {
    throw new Error(
      "We could not verify portal access. Please retry in a moment."
    );
  }

  const { session } = result;

  if (!allowedRoles.includes(session.role)) {
    redirect(portalPathForRole(session.role));
  }

  return session;
}
