import { cn } from "@/lib/utils";

/**
 * Shared editorial primitives for the marketing landing page.
 * Use these to keep the eyebrow + ornament system consistent across sections.
 *
 * Chapter numbering (single source of truth):
 *   01  Planning Manifesto
 *   02  Destinations
 *   03  How it works
 *   04  Curated offerings
 *   05  The network
 *   06  Investment planning
 *   07  Couple notes
 *   08  Concierge brief
 *
 * Sections that are transitional/interstitial (AssuranceStrip, AtmosphereGallery,
 * VendorMarquee internals) intentionally render the eyebrow WITHOUT a chapter
 * number so the throughline reads like a magazine table of contents.
 */

export type MarketingChapterNumber =
  | "01"
  | "02"
  | "03"
  | "04"
  | "05"
  | "06"
  | "07"
  | "08";

export const MARKETING_CHAPTERS: Record<
  MarketingChapterNumber,
  { label: string; href: string }
> = {
  "01": { label: "Planning manifesto", href: "#manifesto" },
  "02": { label: "Destinations", href: "#destinations" },
  "03": { label: "How it works", href: "#how-it-works" },
  "04": { label: "Curated offerings", href: "#packages" },
  "05": { label: "The network", href: "#vendors" },
  "06": { label: "Investment planning", href: "#budget" },
  "07": { label: "Couple notes", href: "#gallery" },
  "08": { label: "Concierge brief", href: "#contact" },
};

type SectionEyebrowProps = {
  /** Optional chapter number. Omit for interstitials. */
  chapter?: MarketingChapterNumber;
  /** Label text. Required. */
  label: string;
  /** Visual emphasis. `lg` is for primary section headers; `sm` for sub-rows. */
  size?: "sm" | "lg";
  /** Tone — `light` for dark-bg sections (Hero, Testimonials, AssuranceStrip). */
  tone?: "default" | "light";
  className?: string;
};

/**
 * The single eyebrow component. Renders `Chapter NN · Label` when a chapter is
 * provided, just `Label` otherwise. Always uppercase, always gold.
 */
export function SectionEyebrow({
  chapter,
  label,
  size = "lg",
  tone = "default",
  className,
}: SectionEyebrowProps) {
  const text = chapter ? `Chapter ${chapter} · ${label}` : label;
  return (
    <p
      className={cn(
        "font-accent uppercase",
        size === "lg"
          ? "text-[11px] tracking-[0.3em]"
          : "text-[10px] tracking-[0.22em]",
        tone === "light" ? "text-gold-light" : "text-gold-primary",
        className
      )}
    >
      {text}
    </p>
  );
}

type OrnamentRuleProps = {
  /** Layout: centered (default) or aligned to a side. */
  align?: "center" | "start";
  /** Max width when centered. Default 180px feels like a section ornament. */
  width?: number;
  /** Tone — `light` for dark backgrounds. */
  tone?: "default" | "light";
  className?: string;
};

/**
 * Hairline-diamond-hairline ornament rule. The single approved way to break
 * a section header from its body — replaces the ad-hoc gradient hairlines that
 * were drifting across components.
 */
export function OrnamentRule({
  align = "center",
  width = 180,
  tone = "default",
  className,
}: OrnamentRuleProps) {
  const hairline =
    tone === "light"
      ? "bg-gradient-to-r from-transparent to-gold-primary/60"
      : "bg-gradient-to-r from-transparent to-gold-primary/45";
  const hairlineLeft =
    tone === "light"
      ? "bg-gradient-to-l from-transparent to-gold-primary/60"
      : "bg-gradient-to-l from-transparent to-gold-primary/45";
  const diamond =
    tone === "light" ? "bg-gold-primary/65" : "bg-gold-primary/55";

  if (align === "start") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <span className={cn("h-px w-10", hairline)} />
        <span className={cn("inline-block h-1.5 w-1.5 rotate-45", diamond)} />
        <span className={cn("h-px w-10", hairlineLeft)} />
      </div>
    );
  }

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      style={{ maxWidth: width, marginLeft: "auto", marginRight: "auto" }}
    >
      <span className={cn("h-px flex-1", hairline)} />
      <span className={cn("inline-block h-1.5 w-1.5 rotate-45", diamond)} />
      <span className={cn("h-px flex-1", hairlineLeft)} />
    </div>
  );
}

type SectionHeaderProps = {
  chapter?: MarketingChapterNumber;
  eyebrow: string;
  title: string | React.ReactNode;
  intro?: string | React.ReactNode;
  align?: "center" | "start";
  tone?: "default" | "light";
  /** Pass an extra max-width if the title is short. */
  titleMaxWidth?: string;
  className?: string;
};

/**
 * Standard section header — eyebrow, title, intro, ornament. The whole thing
 * in one component so we never reinvent the rhythm.
 */
export function SectionHeader({
  chapter,
  eyebrow,
  title,
  intro,
  align = "center",
  tone = "default",
  titleMaxWidth = "max-w-4xl",
  className,
}: SectionHeaderProps) {
  const titleColor =
    tone === "light" ? "text-ivory" : "text-charcoal";
  const introColor =
    tone === "light" ? "text-ivory/72" : "text-slate";

  return (
    <div
      className={cn(
        align === "center" ? "text-center mx-auto" : "text-left",
        className
      )}
    >
      <SectionEyebrow chapter={chapter} label={eyebrow} tone={tone} />
      <h2
        className={cn(
          "mt-5 font-display font-bold leading-[0.96]",
          titleColor,
          titleMaxWidth,
          align === "center" && "mx-auto"
        )}
        style={{ fontSize: "var(--text-h1)" }}
      >
        {title}
      </h2>
      {intro ? (
        <p
          className={cn(
            "mt-5 font-heading text-lg font-light leading-relaxed",
            introColor,
            align === "center" ? "max-w-2xl mx-auto" : "max-w-xl"
          )}
        >
          {intro}
        </p>
      ) : null}
      <OrnamentRule
        align={align === "center" ? "center" : "start"}
        tone={tone}
        className="mt-7"
      />
    </div>
  );
}
