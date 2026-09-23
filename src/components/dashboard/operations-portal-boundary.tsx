"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

type OperationsPortalBoundaryProps = {
  children: React.ReactNode;
  scoped: boolean;
  canReadMessages: boolean;
};

export function OperationsPortalBoundary({
  children,
  scoped,
  canReadMessages,
}: OperationsPortalBoundaryProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isOperationsPath =
    pathname === "/manager/operations" ||
    pathname.startsWith("/manager/operations/");
  const allowed =
    !scoped ||
    isOperationsPath ||
    pathname === "/manager/settings" ||
    (canReadMessages && pathname === "/manager/messages");

  useEffect(() => {
    if (allowed) return;
    router.replace("/manager/operations");
  }, [allowed, router]);

  if (!allowed) {
    return (
      <div className="mx-auto max-w-3xl border border-dashed border-camel/45 bg-cream p-8">
        <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-saddle-brown">
          Event-scoped access
        </p>
        <h1 className="mt-3 font-display text-3xl text-charcoal">
          Returning to your assigned operations rooms
        </h1>
        <p className="mt-3 font-heading text-sm leading-6 text-slate">
          Operations employees can open only the events and tools assigned by an
          administrator.
        </p>
      </div>
    );
  }

  return children;
}
