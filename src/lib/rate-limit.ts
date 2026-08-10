import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

type RateLimitOptions = {
  scope: string;
  limit: number;
  windowSeconds: number;
  identity?: string;
};

function requestAddress(request: Request): string {
  const forwarded =
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "unknown";

  return forwarded.split(",")[0]?.trim() || "unknown";
}

function keyHash(scope: string, identity: string): string {
  return createHash("sha256")
    .update(`${scope}:${identity}`)
    .digest("hex");
}

export async function enforceRateLimit(
  request: Request,
  { scope, limit, windowSeconds, identity }: RateLimitOptions
): Promise<NextResponse | null> {
  try {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase.rpc("consume_api_rate_limit", {
      p_key_hash: keyHash(scope, identity ?? `ip:${requestAddress(request)}`),
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });

    if (error) {
      console.error(`Rate limit failed for ${scope}:`, error);
      return NextResponse.json(
        { error: "Request protection is temporarily unavailable" },
        { status: 503 }
      );
    }

    const result = data?.[0];
    if (!result) {
      console.error(`Rate limit returned no result for ${scope}`);
      return NextResponse.json(
        { error: "Request protection is temporarily unavailable" },
        { status: 503 }
      );
    }

    if (!result.allowed) {
      const retryAfter = Math.max(
        1,
        Math.ceil((new Date(result.reset_at).getTime() - Date.now()) / 1000)
      );
      return NextResponse.json(
        { error: "Too many requests. Please wait and try again." },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        }
      );
    }

    return null;
  } catch (error) {
    console.error(`Rate limit failed for ${scope}:`, error);
    return NextResponse.json(
      { error: "Request protection is temporarily unavailable" },
      { status: 503 }
    );
  }
}
