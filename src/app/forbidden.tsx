import Link from "next/link";
import { editorialBorderButtonClass } from "@/components/auth/auth-styles";

export default function Forbidden() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-charcoal-brown px-6 py-24 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(166,138,100,0.22),transparent_55%)]"
      />
      <div className="relative max-w-lg border border-khaki-beige/20 bg-ebony/70 p-8 shadow-2xl backdrop-blur md:p-12">
        <p className="font-accent text-[10px] uppercase tracking-[0.24em] text-camel">
          Account access
        </p>
        <h1 className="mt-4 font-display text-3xl text-khaki-beige md:text-4xl">
          This account is not active
        </h1>
        <p className="mt-5 text-sm leading-7 text-dry-sage">
          Your sign-in is valid, but portal access has been paused. Contact the
          Elysian operations team if you believe this should be restored.
        </p>
        <Link href="/" className={`${editorialBorderButtonClass} mt-8 inline-flex`}>
          Return to the site
        </Link>
      </div>
    </main>
  );
}
