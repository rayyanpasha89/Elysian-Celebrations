import { NextRequest, NextResponse } from "next/server";
import {
  activeBillingGateway,
  billingGatewayCapability,
  type BillingCheckoutSession,
} from "@/lib/billing-gateway";
import {
  apiError,
  apiSuccess,
  getAuthSession,
  requireRole,
} from "@/lib/api-utils";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database.types";

export const dynamic = "force-dynamic";

type AttemptRow = Database["public"]["Tables"]["billing_payment_attempts"]["Row"];
type BeginCheckoutArgs =
  Database["public"]["Functions"]["begin_billing_checkout"]["Args"];
type AttachOrderArgs =
  Database["public"]["Functions"]["attach_billing_checkout_order"]["Args"];
type Relation<T> = T | T[] | null | undefined;

function one<T>(relation: Relation<T>): T | null {
  return Array.isArray(relation) ? relation[0] ?? null : relation ?? null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function checkoutKey(request: Request) {
  const value = request.headers.get("idempotency-key");
  return value && /^[A-Za-z0-9:_-]{16,160}$/.test(value) ? value : null;
}

function checkoutReturnUrl(request: NextRequest) {
  const configured = process.env.ELYSIAN_APP_URL?.trim();
  const base = new URL(configured || request.nextUrl.origin);
  const localHttp =
    process.env.NODE_ENV !== "production" &&
    base.protocol === "http:" &&
    ["localhost", "127.0.0.1"].includes(base.hostname);
  if (base.protocol !== "https:" && !localHttp) {
    throw new Error("ELYSIAN_APP_URL must use HTTPS outside local development");
  }
  const target = new URL("/client/billing", base.origin);
  target.searchParams.set("checkout", "return");
  return target.toString();
}

function validCheckoutSession(
  session: BillingCheckoutSession,
  expectedProvider: string
) {
  if (session.provider.trim().toUpperCase() !== expectedProvider) return null;
  if (
    !session.providerOrderId.trim() ||
    session.providerOrderId.length > 200
  ) {
    return null;
  }

  let checkoutUrl: URL;
  try {
    checkoutUrl = new URL(session.checkoutUrl);
  } catch {
    return null;
  }
  const localHttp =
    process.env.NODE_ENV !== "production" &&
    checkoutUrl.protocol === "http:" &&
    ["localhost", "127.0.0.1"].includes(checkoutUrl.hostname);
  if (checkoutUrl.protocol !== "https:" && !localHttp) return null;

  const expiry = session.expiresAt
    ? new Date(session.expiresAt)
    : new Date(Date.now() + 20 * 60 * 1000);
  if (
    Number.isNaN(expiry.getTime()) ||
    expiry.getTime() <= Date.now() ||
    expiry.getTime() > Date.now() + 7 * 86_400_000
  ) {
    return null;
  }

  return {
    checkoutUrl: checkoutUrl.toString(),
    providerOrderId: session.providerOrderId.trim(),
    expiresAt: expiry.toISOString(),
  };
}

function checkoutRpcError(error: { code?: string; message?: string | null }) {
  const message = error.message?.trim();
  if (error.code === "42501") return apiError("Invoice not found", 404);
  if (error.code === "55000" || error.code === "23514") {
    return apiError(message || "This invoice cannot start checkout", 409);
  }
  if (error.code === "22004" || error.code === "22023") {
    return apiError(message || "Checkout request is invalid", 400);
  }
  console.error("Billing checkout RPC:", error);
  return apiError("Secure checkout is temporarily unavailable", 503);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "client");
  if (roleCheck) return roleCheck;

  const limited = await enforceRateLimit(request, {
    scope: "client-billing-checkout",
    limit: 8,
    windowSeconds: 60,
    identity: session.userId,
  });
  if (limited) return limited;

  const { id } = await params;
  if (!isUuid(id)) return apiError("Invalid invoice ID", 400);
  const retryKey = checkoutKey(request);
  if (!retryKey) {
    return apiError("A valid Idempotency-Key header is required", 400);
  }

  const gateway = activeBillingGateway();
  if (!gateway) {
    return apiError(billingGatewayCapability().reason, 503);
  }
  const provider = gateway.provider.trim().toUpperCase();
  if (!provider || provider.length > 32) {
    console.error("Active billing gateway has an invalid provider name");
    return apiError("Secure checkout is temporarily unavailable", 503);
  }

  try {
    const supabase = createAdminSupabaseClient();
    const { data: profile, error: profileError } = await supabase
      .from("client_profiles")
      .select("id, user:users(name, email)")
      .eq("user_id", session.userId)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile) return apiError("Client profile not found", 404);

    const { data: invoice, error: invoiceError } = await supabase
      .from("billing_invoices")
      .select("id, invoice_number, amount, currency, status")
      .eq("id", id)
      .eq("client_profile_id", profile.id)
      .maybeSingle();
    if (invoiceError) throw invoiceError;
    if (!invoice) return apiError("Invoice not found", 404);
    if (invoice.status !== "ISSUED") {
      return apiError("Only an issued invoice can be paid", 409);
    }

    const beginArgs = {
      p_actor_user_id: session.userId,
      p_invoice_id: invoice.id,
      p_provider: provider,
      p_idempotency_key: retryKey,
    } satisfies BeginCheckoutArgs;
    const { data: attemptData, error: attemptError } = await supabase.rpc(
      "begin_billing_checkout",
      beginArgs
    );
    if (attemptError) return checkoutRpcError(attemptError);
    const attempt = attemptData as unknown as AttemptRow | null;
    if (!attempt?.id) {
      return apiError("Checkout attempt could not be created", 503);
    }
    if (["CAPTURED", "FAILED", "CANCELLED"].includes(attempt.status)) {
      return apiError(
        "That checkout request has ended. Start again with a new request.",
        409
      );
    }

    const user = one(
      profile.user as Relation<{ name: string | null; email: string | null }>
    );
    let gatewaySession: BillingCheckoutSession;
    try {
      gatewaySession = await gateway.createCheckout({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        amountMinor: Number(attempt.amount_minor),
        currency: "INR",
        idempotencyKey: attempt.idempotency_key,
        clientName: user?.name?.trim() || "Elysian client",
        clientEmail: user?.email ?? null,
        returnUrl: checkoutReturnUrl(request),
      });
    } catch (error) {
      console.error("Billing provider checkout creation failed:", error);
      return apiError(
        "The payment provider did not start checkout. Retrying is safe.",
        502
      );
    }

    const verifiedSession = validCheckoutSession(gatewaySession, provider);
    if (!verifiedSession) {
      console.error("Billing provider returned an invalid checkout session");
      return apiError("The payment provider returned an invalid checkout", 502);
    }

    const attachArgs = {
      p_actor_user_id: session.userId,
      p_attempt_id: attempt.id,
      p_provider_order_id: verifiedSession.providerOrderId,
      p_checkout_expires_at: verifiedSession.expiresAt,
      p_metadata: { checkoutMode: "HOSTED_REDIRECT" } satisfies Json,
    } satisfies AttachOrderArgs;
    const { data: attachedData, error: attachError } = await supabase.rpc(
      "attach_billing_checkout_order",
      attachArgs
    );
    if (attachError) return checkoutRpcError(attachError);
    const attached = attachedData as unknown as AttemptRow | null;
    if (!attached?.id) {
      return apiError("Checkout order could not be recorded", 503);
    }

    return apiSuccess(
      {
        attemptId: attached.id,
        provider: attached.provider,
        checkoutUrl: verifiedSession.checkoutUrl,
        expiresAt: verifiedSession.expiresAt,
      },
      201
    );
  } catch (error) {
    console.error("POST /api/client/billing/[id]/checkout:", error);
    return apiError("Secure checkout is temporarily unavailable", 503);
  }
}
