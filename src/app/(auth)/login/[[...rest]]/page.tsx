import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { clerkAuthAppearance } from "@/lib/clerk-appearance";

function hasClerkKeys() {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return (
    typeof pk === "string" &&
    pk.length > 0 &&
    !pk.includes("REPLACE_ME")
  );
}

export default function LoginPage() {
  if (!hasClerkKeys()) {
    return (
      <div className="flex flex-col gap-6 font-heading text-sm text-slate">
        <p>Sign-in is not configured. Add <code className="text-charcoal">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> and <code className="text-charcoal">CLERK_SECRET_KEY</code> to your environment.</p>
        <Link
          href="/"
          className="font-accent text-[11px] uppercase tracking-[0.2em] text-gold-primary underline-offset-4 hover:underline"
        >
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col">
      <p className="font-accent mb-10 text-[10px] uppercase tracking-[0.28em] text-slate">
        Sign in
      </p>
      <SignIn
        path="/login"
        routing="path"
        appearance={clerkAuthAppearance}
      />
    </div>
  );
}
