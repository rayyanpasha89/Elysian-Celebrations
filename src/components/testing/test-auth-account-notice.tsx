export function TestAuthAccountNotice() {
  return (
    <div className="border border-dashed border-gold-primary/45 bg-gold-primary/8 px-4 py-4">
      <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-gold-dark">
        Clerk paused
      </p>
      <p className="font-heading mt-2 text-sm leading-relaxed text-slate">
        Account security panels are hidden while local test auth is enabled.
        Product data still saves through Supabase, so dashboard QA can continue
        without email verification codes.
      </p>
    </div>
  );
}
