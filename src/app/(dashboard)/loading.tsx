export default function DashboardLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto min-h-screen w-full max-w-[1600px] px-4 py-8 sm:px-6 lg:px-10"
    >
      <div className="motion-safe:animate-pulse">
        <div className="h-3 w-28 bg-charcoal/10" />
        <div className="mt-4 h-10 w-full max-w-md bg-charcoal/10" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 border border-charcoal/8 bg-ivory/70" />
          ))}
        </div>
        <div className="mt-6 h-80 border border-charcoal/8 bg-ivory/70" />
      </div>
      <span className="sr-only">Loading planning workspace</span>
    </div>
  );
}
