import { NextRequest, NextResponse } from "next/server";
import { apiError, apiSuccess, getAuthSession, requireRole } from "@/lib/api-utils";
import { loadAdminInvoice } from "@/lib/billing-server";
import { isPaymentMethod } from "@/lib/payment-ledger";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

type SettleInvoiceArgs =
  Database["public"]["Functions"]["settle_billing_invoice"]["Args"];
type VoidInvoiceArgs =
  Database["public"]["Functions"]["void_billing_invoice"]["Args"];
type RefundInvoiceArgs =
  Database["public"]["Functions"]["record_billing_refund"]["Args"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalText(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : null;
}

function optionalTimestamp(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function positiveMoney(value: unknown) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    return null;
  }
  return value <= 2_147_483_647 ? value : null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function idempotencyKey(request: Request, body: Record<string, unknown>) {
  const value = request.headers.get("idempotency-key") ?? body.idempotencyKey;
  return typeof value === "string" && /^[A-Za-z0-9:_-]{16,160}$/.test(value)
    ? value
    : null;
}

function actionError(error: { code?: string; message?: string | null }) {
  const message = error.message?.trim();
  if (error.code === "P0002") return apiError(message || "Invoice not found", 404);
  if (error.code === "23514") {
    return apiError(message || "Invoice cannot be changed", 409);
  }
  if (error.code === "22023") {
    return apiError(message || "Invalid billing action", 400);
  }
  console.error("Billing invoice action RPC:", error);
  return apiError("The billing action could not be completed", 500);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "admin");
  if (roleCheck) return roleCheck;

  const limited = await enforceRateLimit(request, {
    scope: "billing-invoice-action",
    limit: 30,
    windowSeconds: 60,
    identity: session.userId,
  });
  if (limited) return limited;

  const { id: invoiceId } = await params;
  if (!isUuid(invoiceId)) return apiError("Invalid invoice", 400);
  try {
    const rawBody: unknown = await request.json();
    if (!isRecord(rawBody)) return apiError("Invalid billing action", 400);

    const supabase = createAdminSupabaseClient();
    if (rawBody.action === "settle") {
      const method = optionalText(rawBody.method, 20)?.toUpperCase() ?? null;
      const paidAt = optionalTimestamp(rawBody.paidAt);
      if (!isPaymentMethod(method)) return apiError("Choose a payment method", 400);
      if (rawBody.paidAt && !paidAt) return apiError("Invalid settlement date", 400);

      const args = {
        p_invoice_id: invoiceId,
        p_method: method,
        p_paid_at: paidAt,
        p_reference: optionalText(rawBody.reference, 160),
        p_actor_user_id: session.userId,
      } as unknown as SettleInvoiceArgs;
      const { error } = await supabase.rpc("settle_billing_invoice", args);
      if (error) return actionError(error);
    } else if (rawBody.action === "void") {
      const reason = optionalText(rawBody.reason, 500);
      if (!reason) return apiError("Explain why this invoice is being voided", 400);

      const args = {
        p_invoice_id: invoiceId,
        p_reason: reason,
        p_actor_user_id: session.userId,
      } as VoidInvoiceArgs;
      const { error } = await supabase.rpc("void_billing_invoice", args);
      if (error) return actionError(error);
    } else if (rawBody.action === "refund") {
      const amount = positiveMoney(rawBody.amount);
      const method = optionalText(rawBody.method, 20)?.toUpperCase() ?? null;
      const reason = optionalText(rawBody.reason, 500);
      const retryKey = idempotencyKey(request, rawBody);
      if (!amount) return apiError("Enter a positive refund amount", 400);
      if (!isPaymentMethod(method)) return apiError("Choose a refund method", 400);
      if (!reason) return apiError("Explain why this refund is being recorded", 400);
      if (!retryKey) return apiError("A valid idempotency key is required", 400);

      const args = {
        p_invoice_id: invoiceId,
        p_amount: amount,
        p_idempotency_key: retryKey,
        p_method: method,
        p_reference: optionalText(rawBody.reference, 160),
        p_reason: reason,
        p_actor_user_id: session.userId,
      } as unknown as RefundInvoiceArgs;
      const { error } = await supabase.rpc("record_billing_refund", args);
      if (error) return actionError(error);
    } else {
      return apiError("Choose settle, void, or refund", 400);
    }

    const invoice = await loadAdminInvoice(invoiceId);
    if (!invoice) return apiError("Invoice not found", 404);
    return apiSuccess({ invoice });
  } catch (error) {
    console.error("PATCH /api/admin/billing/[id]:", error);
    return apiError("The billing action could not be completed", 500);
  }
}
