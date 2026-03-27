export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ivory">
      <div className="grid min-h-screen lg:grid-cols-2">
        <aside className="relative hidden min-h-screen lg:block">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "linear-gradient(135deg, hsl(220, 22%, 14%) 0%, hsl(30, 18%, 12%) 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(145deg, rgba(201, 169, 110, 0.42) 0%, rgba(26, 26, 46, 0.88) 45%, rgba(26, 26, 46, 0.95) 100%)",
            }}
          />
          <div className="absolute inset-0 opacity-[0.07] [background-image:repeating-linear-gradient(-12deg,transparent,transparent_2px,rgba(250,247,242,0.06)_2px,rgba(250,247,242,0.06)_3px)]" />
          <div className="absolute bottom-0 left-0 w-full p-12 text-ivory">
            <p className="font-display text-4xl tracking-tight md:text-5xl">Elysian</p>
            <p className="font-heading mt-6 max-w-md text-sm font-light leading-relaxed text-ivory/75">
              Luxury destination weddings—planned with precision, delivered with warmth.
            </p>
          </div>
        </aside>

        <div className="flex min-h-screen flex-col justify-center px-6 py-16 md:px-16 lg:px-20">
          <div className="mx-auto w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}
