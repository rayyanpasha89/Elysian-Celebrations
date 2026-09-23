"use client";

import { Printer } from "lucide-react";

export function PrintEventBookButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 border border-khaki-beige bg-khaki-beige px-5 py-3 font-accent text-[10px] uppercase tracking-[0.18em] text-charcoal-brown transition-colors hover:bg-dry-sage"
    >
      <Printer className="h-4 w-4" aria-hidden />
      Print or save PDF
    </button>
  );
}
