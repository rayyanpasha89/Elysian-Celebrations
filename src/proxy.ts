import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import {
  portalPathForRole,
  portalMismatchRedirectPath,
  roleFromSessionClaims,
} from "@/lib/role-utils";
import type { UserRole } from "@/lib/auth-types";
import {
  isTestAuthEnabled,
  TEST_AUTH_COOKIE,
  TEST_AUTH_QUERY_PARAM,
  testAuthRoleFromValue,
} from "@/lib/test-auth";

const hasClerkKeys =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("REPLACE_ME");
const protectedPrefixes = ["/client", "/vendor", "/admin", "/manager"];

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

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
      const { userId, sessionClaims } = await auth();
      if (!userId) {
        const signInUrl = new URL("/login", request.url);
        signInUrl.searchParams.set(
          "redirect_url",
          `${request.nextUrl.pathname}${request.nextUrl.search}`
        );
        return NextResponse.redirect(signInUrl);
      }
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

function testAuthHandler(req: NextRequest) {
  const requestedRole = req.nextUrl.searchParams.get(TEST_AUTH_QUERY_PARAM);
  const role = testAuthRoleFromValue(
    requestedRole ?? req.cookies.get(TEST_AUTH_COOKIE)?.value
  );
  const pathname = req.nextUrl.pathname;
  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/register");
  const isProtectedRoute = isProtectedPath(pathname);

  let response: NextResponse;

  if (requestedRole) {
    const nextUrl = req.nextUrl.clone();
    nextUrl.searchParams.delete(TEST_AUTH_QUERY_PARAM);
    if (isAuthRoute) {
      nextUrl.pathname = portalPathForRole(role);
    }
    response = NextResponse.redirect(nextUrl);
  } else if (isAuthRoute) {
    response = NextResponse.redirect(new URL(portalPathForRole(role), req.url));
  } else if (isProtectedRoute) {
    const nextPath = portalMismatchRedirectPath(pathname, role);
    response = nextPath
      ? NextResponse.redirect(new URL(nextPath, req.url))
      : NextResponse.next();
  } else {
    response = NextResponse.next();
  }

  response.cookies.set(TEST_AUTH_COOKIE, role, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}

export default async function proxy(
  req: NextRequest,
  event: NextFetchEvent
) {
  if (isTestAuthEnabled()) {
    return testAuthHandler(req);
  }

  if (hasClerkKeys) {
    return clerkHandler(req, event);
  }

  if (process.env.NODE_ENV === "production") {
    const pathname = req.nextUrl.pathname;
    if (pathname.startsWith("/api/") || isProtectedPath(pathname)) {
      return NextResponse.json(
        { error: "Authentication is not configured" },
        { status: 503 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
