"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  normalizeRole,
  portalMismatchRedirectPath,
} from "@/lib/role-utils";
import type { UserRole } from "@/lib/auth-types";

export function PortalRoleGuard() {
  const pathname = usePathname();
  const { user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded || !user || !pathname) return;
    const raw = user.publicMetadata?.role;
    const role = normalizeRole(raw);
    if (!role) return;
    const path = portalMismatchRedirectPath(pathname, role as UserRole);
    if (path) {
      router.replace(path);
    }
  }, [isLoaded, user, pathname, router]);

  return null;
}
