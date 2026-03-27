import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const hasClerkKeys =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("REPLACE_ME");

async function clerkHandler(req: NextRequest) {
  const { clerkMiddleware, createRouteMatcher } = await import(
    "@clerk/nextjs/server"
  );
  const isProtectedRoute = createRouteMatcher([
    "/client(.*)",
    "/vendor(.*)",
    "/admin(.*)",
  ]);
  return clerkMiddleware(async (auth, request) => {
    if (isProtectedRoute(request)) {
      await auth.protect();
    }
  })(req, {} as any);
}

export default async function middleware(req: NextRequest) {
  if (hasClerkKeys) {
    return clerkHandler(req);
  }
  // No-op when Clerk is not configured
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
