"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  TEST_AUTH_QUERY_PARAM,
  TEST_AUTH_ROLES,
  testAuthLabelForRole,
} from "@/lib/test-auth";
import { portalPathForRole } from "@/lib/role-utils";
import { cn } from "@/lib/utils";

export function TestAuthSwitcher() {
  const pathname = usePathname();
  const currentRoot = pathname?.split("/").filter(Boolean)[0] ?? "";

  return (
    <aside className="fixed bottom-4 right-4 z-[80] hidden max-w-[calc(100vw-2rem)] text-ivory md:block">
      <details className="group border border-gold-primary/35 bg-midnight/92 shadow-[0_24px_80px_rgba(51,61,41,0.24)] backdrop-blur-xl">
        <summary className="cursor-pointer list-none px-3 py-2 font-accent text-[9px] uppercase tracking-[0.2em] text-gold-light marker:content-none">
          Local test roles
        </summary>
        <div className="border-t border-ivory/10 p-3">
          <p className="font-accent text-[9px] uppercase tracking-[0.22em] text-ivory/55">
            Clerk paused for testing
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {TEST_AUTH_ROLES.map((role) => {
              const active = currentRoot === role;
              const href = `${portalPathForRole(role)}?${TEST_AUTH_QUERY_PARAM}=${role}`;
              return (
                <Link
                  key={role}
                  href={href}
                  className={cn(
                    "border px-2.5 py-1.5 font-accent text-[9px] uppercase tracking-[0.16em] transition-colors",
                    active
                      ? "border-gold-primary bg-gold-primary text-midnight"
                      : "border-ivory/15 text-ivory/70 hover:border-gold-primary/70 hover:text-ivory"
                  )}
                >
                  {testAuthLabelForRole(role)}
                </Link>
              );
            })}
          </div>
        </div>
      </details>
    </aside>
  );
}
