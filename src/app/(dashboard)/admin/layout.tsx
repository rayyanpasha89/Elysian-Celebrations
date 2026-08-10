import type { NavGroup } from "@/components/dashboard/sidebar";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { requirePortalPageRole } from "@/lib/portal-auth";

const navGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/admin" },
      { label: "Analytics", href: "/admin/analytics" },
    ],
  },
  {
    title: "Revenue",
    items: [
      { label: "Final Pricing", href: "/admin/pricing" },
      { label: "Client Progress", href: "/admin/progress" },
      { label: "Revenue Dashboard", href: "/admin/revenue" },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "Vendors", href: "/admin/vendors" },
      { label: "Clients", href: "/admin/clients" },
      { label: "Destinations", href: "/admin/destinations" },
      { label: "Packages", href: "/admin/packages" },
      { label: "Venues", href: "/admin/venues" },
    ],
  },
  {
    title: "Content",
    items: [
      { label: "Blog Posts", href: "/admin/blog" },
      { label: "Testimonials", href: "/admin/testimonials" },
      { label: "Inquiries", href: "/admin/inquiries" },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Users", href: "/admin/users" },
      { label: "Settings", href: "/admin/settings" },
    ],
  },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requirePortalPageRole("/admin", "admin");

  return (
    <PortalShell
      groups={navGroups}
      portalName="Admin Portal"
      portalHref="/admin"
      fallbackName="Admin"
      role={session.role}
    >
      {children}
    </PortalShell>
  );
}
