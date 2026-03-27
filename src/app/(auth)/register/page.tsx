import { SignUp } from "@clerk/nextjs";

export default function RegisterPage() {
  return (
    <div className="flex items-center justify-center">
      <SignUp
        appearance={{
          elements: {
            rootBox: "w-full max-w-md",
            card: "bg-cream border border-charcoal/8 shadow-none rounded-none",
            headerTitle: "font-display text-3xl font-semibold tracking-tight text-charcoal",
            headerSubtitle: "font-heading text-sm font-light text-slate",
            socialButtonsBlockButton: "border border-charcoal/15 rounded-none font-accent text-[11px] uppercase tracking-[0.15em]",
            formButtonPrimary: "bg-charcoal text-ivory rounded-none font-accent text-[11px] uppercase tracking-[0.2em] hover:bg-charcoal/90 transition-colors",
            formFieldInput: "border-0 border-b border-charcoal/20 rounded-none bg-transparent focus:border-gold-primary focus:ring-0 font-heading text-sm",
            formFieldLabel: "font-heading text-sm text-slate",
            footerActionLink: "font-accent text-[11px] uppercase tracking-[0.2em] text-gold-primary hover:underline",
            dividerLine: "bg-charcoal/10",
            dividerText: "font-accent text-[10px] uppercase tracking-[0.2em] text-slate",
          },
        }}
      />
    </div>
  );
}
