import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import {
  portalMismatchRedirectPath,
  roleFromSessionClaims,
} from "@/lib/role-utils";
import type { UserRole } from "@/lib/auth-types";

const hasClerkKeys =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("REPLACE_ME");

async function clerkHandler(req: NextRequest, event: NextFetchEvent) {
  const { clerkMiddleware, createRouteMatcher } = await import(
    "@clerk/nextjs/server"
  );
  const isAuthRoute = createRouteMatcher([
    "/login(.*)",
    "/register(.*)",
  ]);
  const isProtectedRoute = createRouteMatcher([
    "/client(.*)",
    "/vendor(.*)",
    "/admin(.*)",
    "/manager(.*)",
  ]);
  return clerkMiddleware(async (auth, request) => {
    if (isAuthRoute(request)) {
      return;
    }
    if (isProtectedRoute(request)) {
      await auth.protect();
      const { sessionClaims } = await auth();
      const role = roleFromSessionClaims(
        sessionClaims as Record<string, unknown> | undefined
      );
      if (role) {
        const nextPath = portalMismatchRedirectPath(
          request.nextUrl.pathname,
          role as UserRole
        );
        if (nextPath) {
          return NextResponse.redirect(new URL(nextPath, request.url));
        }
      }
    }
  })(req, event);
}

export default async function proxy(
  req: NextRequest,
  event: NextFetchEvent
) {
  if (hasClerkKeys) {
    return clerkHandler(req, event);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
