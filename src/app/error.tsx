"use client";

import Link from "next/link";
import { editorialBorderButtonClass } from "@/components/auth/auth-styles";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="relative flex min-h-[85vh] flex-col items-center justify-center overflow-hidden bg-midnight px-6 py-24">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span
          className="font-display select-none font-bold leading-none text-gold-primary/15"
          style={{ fontSize: "clamp(8rem, 28vw, 18rem)" }}
          aria-hidden
        >
          !
        </span>
      </div>
      <div className="relative z-10 max-w-md text-center">
        <h1 className="font-display text-2xl font-semibold text-ivory md:text-3xl">
          Something went wrong
        </h1>
        <p className="font-heading mt-4 text-sm font-light text-ivory/55">
          {error.message || "An unexpected error occurred."}
        </p>
        <div className="mt-10 flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
          <button type="button" onClick={() => reset()} className={editorialBorderButtonClass}>
            Try again
          </button>
          <Link
            href="/"
            className="group font-accent text-[11px] uppercase tracking-[0.2em] text-ivory/50 transition-colors hover:text-gold-primary"
          >
            <span className="relative inline-block pb-1">
              Return home
              <span className="absolute bottom-0 left-0 h-[1px] w-full origin-left scale-x-0 bg-gold-primary transition-transform duration-500 group-hover:scale-x-100" />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
