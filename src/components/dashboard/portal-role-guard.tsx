"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { portalMismatchRedirectPath } from "@/lib/role-utils";
import type { UserRole } from "@/lib/auth-types";

export function PortalRoleGuard({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!pathname) return;
    const path = portalMismatchRedirectPath(pathname, role);
    if (path) {
      router.replace(path);
    }
  }, [pathname, role, router]);

  return null;
}
