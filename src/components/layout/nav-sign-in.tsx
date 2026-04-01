"use client";

import Link from "next/link";
import { SignInButton, useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

const clerkConfigured =
  typeof process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === "string" &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.length > 0 &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("REPLACE_ME");

type NavSignInProps = {
  className: string;
  onNavigate?: () => void;
};

function portalPath(role: unknown): string {
  if (typeof role !== "string") return "/client";
  const r = role.toLowerCase();
  if (r === "admin") return "/admin";
  if (r === "vendor") return "/vendor";
  if (r === "manager") return "/manager";
  return "/client";
}

function portalLabel(role: unknown): string {
  if (typeof role !== "string") return "Dashboard";
  const r = role.toLowerCase();
  if (r === "admin") return "Admin Panel";
  if (r === "vendor") return "Vendor Portal";
  if (r === "manager") return "Manager Panel";
  return "Dashboard";
}

export function NavSignIn({ className, onNavigate }: NavSignInProps) {
  if (!clerkConfigured) {
    return (
      <Link href="/login" className={className} onClick={() => onNavigate?.()}>
        Sign in
      </Link>
    );
  }

  return <ClerkAuthNav className={className} onNavigate={onNavigate} />;
}

function ClerkAuthNav({
  className,
  onNavigate,
}: {
  className: string;
  onNavigate?: () => void;
}) {
  const { isSignedIn, user, isLoaded } = useUser();

  if (!isLoaded) return null;

  if (isSignedIn && user) {
    const role = (user.publicMetadata as { role?: string } | undefined)?.role;
    const path = portalPath(role);
    const label = portalLabel(role);

    return (
      <Link
        href={path}
        className={className}
        onClick={() => onNavigate?.()}
      >
        {label}
      </Link>
    );
  }

  return (
    <span className="inline-flex" onClickCapture={() => onNavigate?.()}>
      <SignInButton mode="redirect" fallbackRedirectUrl="/client">
        <button
          type="button"
          className={cn(
            className,
            "cursor-pointer border-0 bg-transparent p-0 text-left font-inherit"
          )}
        >
          Sign in
        </button>
      </SignInButton>
    </span>
  );
}
