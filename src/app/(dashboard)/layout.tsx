export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(135deg,#f5f0e7_0%,#fbf8f1_42%,#eee5d7_100%)] font-sans text-charcoal">
      <div className="pointer-events-none fixed inset-0 opacity-45 [background-image:linear-gradient(rgba(24,24,20,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(24,24,20,0.035)_1px,transparent_1px)] [background-size:36px_36px]" />
      <div className="pointer-events-none fixed -right-28 top-20 h-72 w-72 rounded-full bg-gold-primary/12 blur-3xl" />
      <div className="pointer-events-none fixed bottom-10 left-72 h-64 w-64 rounded-full bg-sage/10 blur-3xl" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
