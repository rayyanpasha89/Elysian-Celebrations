import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-charcoal md:text-4xl">
        Reset password
      </h1>
      <p className="font-heading mt-3 text-sm font-light text-slate">
        Password reset is handled securely through your sign-in page. Open sign in, choose
        &quot;Forgot password&quot;, and follow the email link from Clerk.
      </p>
      <Link
        href="/login"
        className="font-accent mt-10 inline-block text-[11px] uppercase tracking-[0.2em] text-gold-primary underline-offset-4 hover:underline"
      >
        Go to sign in
      </Link>
    </div>
  );
}
