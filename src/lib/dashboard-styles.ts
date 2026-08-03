import { cn } from "@/lib/utils";

export const DASHBOARD_CHART_COLORS = {
  walnut: "#582F0E",
  saddle: "#7F4F24",
  toffee: "#936639",
  camel: "#A68A64",
  khaki: "#B6AD90",
  drySage: "#C2C5AA",
  sage: "#A4AC86",
  olive: "#656D4A",
  ebony: "#414833",
  charcoal: "#333D29",
} as const;

export const DASHBOARD_CHART_PALETTE = [
  DASHBOARD_CHART_COLORS.walnut,
  DASHBOARD_CHART_COLORS.saddle,
  DASHBOARD_CHART_COLORS.camel,
  DASHBOARD_CHART_COLORS.olive,
  DASHBOARD_CHART_COLORS.sage,
  DASHBOARD_CHART_COLORS.toffee,
  DASHBOARD_CHART_COLORS.ebony,
  DASHBOARD_CHART_COLORS.khaki,
] as const;

export const dashCard = "border border-charcoal/8 bg-ivory p-6";

export const dashBtn =
  "font-accent inline-flex items-center justify-center border border-gold-primary bg-transparent px-6 py-3 text-[11px] uppercase tracking-[0.2em] text-gold-primary transition-all duration-500 hover:bg-gold-primary hover:text-midnight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-charcoal disabled:pointer-events-none disabled:opacity-40";

export const dashLabel = "font-accent text-[10px] uppercase tracking-[0.2em] text-slate";

export const statusBadgeBase =
  "inline-block border px-3 py-1 font-accent text-[10px] uppercase tracking-[0.15em]";

export function rsvpBadgeClass(status: "CONFIRMED" | "PENDING" | "DECLINED" | "MAYBE") {
  return cn(
    statusBadgeBase,
    status === "CONFIRMED" && "border-sage/60 text-sage",
    status === "PENDING" && "border-gold-primary/60 text-gold-dark",
    status === "DECLINED" && "border-charcoal/25 text-slate",
    status === "MAYBE" && "border-charcoal/20 text-charcoal/60",
  );
}
