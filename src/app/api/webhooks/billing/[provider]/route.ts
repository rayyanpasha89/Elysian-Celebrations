import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-utils";
import { activeBillingGateway } from "@/lib/billing-gateway";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ProcessGatewayEventArgs =
  Database["public"]["Functions"]["process_billing_gateway_event"]["Args"];
type GatewayResult = {
  ok?: boolean;
  duplicate?: boolean;
  status?: string;
  reason?: string;
};

function bounded(value: string | null, max: number) {
  const normalized = value?.trim() || null;
  return normalized && normalized.length <= max ? normalized : null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: rawProvider } = await params;
  const routeProvider = rawProvider.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{1,32}$/.test(routeProvider)) {
    return apiError("Unknown billing provider", 404);
  }

  const gateway = activeBillingGateway();
  if (!gateway || gateway.provider.trim().toUpperCase() !== routeProvider) {
    return apiError("Unknown billing provider", 404);
  }

  const limited = await enforceRateLimit(request, {
    scope: `billing-webhook-${routeProvider.toLowerCase()}`,
    limit: 600,
    windowSeconds: 60,
  });
  if (limited) return limited;

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > 1_000_000) {
    return apiError("Webhook payload is too large", 413);
  }
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > 1_000_000) {
    return apiError("Webhook payload is too large", 413);
  }

  let event;
  try {
    event = await gateway.verifyWebhook(rawBody, request.headers);
  } catch (error) {
    console.error(`Invalid ${routeProvider} billing webhook:`, error);
    return apiError("Invalid webhook signature", 400);
  }

  const providerEventId = bounded(event.providerEventId, 200);
  const eventType = bounded(event.eventType, 160);
  const providerOrderId = bounded(event.providerOrderId, 200);
  const providerPaymentId = bounded(event.providerPaymentId, 200);
  const occurredAt = new Date(event.occurredAt);
  if (
    !providerEventId ||
    !eventType ||
    Number.isNaN(occurredAt.getTime()) ||
    !["CAPTURED", "FAILED", "IGNORED"].includes(event.status)
  ) {
    return apiError("Verified webhook payload is incomplete", 400);
  }

  const payloadDigest = createHash("sha256").update(rawBody, "utf8").digest("hex");
  const args = {
    p_provider: routeProvider,
    p_provider_event_id: providerEventId,
    p_event_type: eventType,
    p_payload_sha256: payloadDigest,
    p_provider_order_id: providerOrderId,
    p_provider_payment_id: providerPaymentId,
    p_status: event.status,
    p_occurred_at: occurredAt.toISOString(),
    p_failure_code: bounded(event.failureCode ?? null, 120),
    p_failure_message: bounded(event.failureMessage ?? null, 500),
  } as unknown as ProcessGatewayEventArgs;

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.rpc(
    "process_billing_gateway_event",
    args
  );
  if (error) {
    if (error.code === "22023") {
      return apiError(error.message || "Webhook event is invalid", 400);
    }
    if (error.code === "23514") {
      return apiError(error.message || "Webhook replay conflict", 409);
    }
    console.error("Billing gateway webhook RPC:", error);
    return apiError("Webhook processing is temporarily unavailable", 503);
  }

  const result = data as unknown as GatewayResult | null;
  if (!result?.ok) {
    if (result?.reason === "PAYMENT_ID_CONFLICT") {
      return apiError("Webhook payment identity conflicts with checkout", 409);
    }
    console.error("Billing webhook needs retry:", result);
    return apiError("Webhook processing is not complete", 503);
  }

  return apiSuccess({
    ok: true,
    duplicate: result.duplicate === true,
    status: result.status ?? "PROCESSED",
  });
}
