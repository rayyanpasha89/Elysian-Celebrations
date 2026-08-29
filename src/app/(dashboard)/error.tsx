"use client";

import { useEffect } from "react";
import Link from "next/link";
import { dashBtn, dashCard, dashLabel } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-ivory px-5 py-16">
      <div
        role="alert"
        className={cn(
          dashCard,
          "w-full max-w-2xl border-dashed border-gold-primary/45 bg-gold-primary/[0.04] p-7 md:p-10"
        )}
      >
        <p className={dashLabel}>Planning workspace</p>
        <h1 className="mt-3 font-display text-3xl text-charcoal md:text-4xl">
          This workspace needs another moment.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate md:text-base">
          Your saved plan has not been changed. Retry the live data, or return to
          your portal and open another section.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <button type="button" onClick={() => unstable_retry()} className={dashBtn}>
            Try again
          </button>
          <Link href="/" className={cn(dashBtn, "border-charcoal/20 bg-transparent text-charcoal")}>
            Return home
          </Link>
        </div>
      </div>
    </main>
  );
}
