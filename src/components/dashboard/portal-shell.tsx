"use client";

import { useUser } from "@clerk/nextjs";
import type { UserRole } from "@/lib/auth-types";
import { dashboardRoleLabel } from "@/lib/role-utils";
import { PortalRoleGuard } from "@/components/dashboard/portal-role-guard";
import {
  MobileSidebar,
  Sidebar,
  type NavGroup,
} from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";

type PortalShellProps = {
  children: React.ReactNode;
  groups: NavGroup[];
  portalName: string;
  portalHref: string;
  fallbackName: string;
  role: UserRole;
};

export function PortalShell({
  children,
  groups,
  portalName,
  portalHref,
  fallbackName,
  role,
}: PortalShellProps) {
  const { user } = useUser();

  return (
    <>
      <PortalRoleGuard role={role} />
      <Sidebar groups={groups} portalName={portalName} portalHref={portalHref} />
      <MobileSidebar groups={groups} portalName={portalName} portalHref={portalHref} />
      <div className="lg:pl-64">
        <Topbar
          userName={user?.fullName ?? fallbackName}
          userRole={dashboardRoleLabel(role, fallbackName)}
        />
        <main className="px-6 py-8 lg:px-8">{children}</main>
      </div>
    </>
  );
}
