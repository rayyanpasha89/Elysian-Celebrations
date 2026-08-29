export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[60vh] flex-col items-center justify-center bg-ivory px-6 py-24"
    >
      <div className="h-[2px] w-48 overflow-hidden bg-charcoal/10">
        <div className="h-full w-full origin-left bg-gold-primary motion-safe:animate-pulse" />
      </div>
      <span className="sr-only">Loading page</span>
    </div>
  );
}
