import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative flex min-h-[85vh] flex-col items-center justify-center overflow-hidden bg-midnight px-6 py-24">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span
          className="font-display select-none font-bold leading-none text-gold-primary/20"
          style={{ fontSize: "clamp(12rem, 42vw, 32rem)" }}
          aria-hidden
        >
          404
        </span>
      </div>
      <div className="relative z-10 max-w-md text-center">
        <h1 className="font-display text-2xl font-semibold text-ivory md:text-3xl">Page not found</h1>
        <p className="font-heading mt-4 text-sm font-light text-ivory/55">
          The page you requested is not in our itinerary.
        </p>
        <Link
          href="/"
          className="group font-accent mt-10 inline-block text-[11px] uppercase tracking-[0.2em] text-gold-primary"
        >
          <span className="relative inline-block pb-1">
            Back to home
            <span className="absolute bottom-0 left-0 h-[1px] w-full origin-left scale-x-0 bg-gold-primary transition-transform duration-500 group-hover:scale-x-100" />
          </span>
        </Link>
      </div>
    </div>
  );
}
