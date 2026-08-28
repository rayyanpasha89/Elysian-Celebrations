import { NextRequest, NextResponse } from "next/server";
import {
  apiError,
  apiSuccess,
  getAuthSession,
  requireRole,
} from "@/lib/api-utils";
import { isPaymentMethod } from "@/lib/payment-ledger";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

type SettleArgs =
  Database["public"]["Functions"]["settle_booking_payment"]["Args"];
type VoidArgs =
  Database["public"]["Functions"]["void_booking_payment"]["Args"];

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

function actionError(error: { code?: string; message?: string | null }) {
  const message = error.message?.trim();
  if (error.code === "P0002") return apiError(message || "Payment not found", 404);
  if (error.code === "23514") return apiError(message || "Payment cannot be changed", 409);
  if (error.code === "22023") return apiError(message || "Invalid payment action", 400);
  console.error("Payment action RPC:", error);
  return apiError("Could not update the payment", 500);
}

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; paymentId: string }> }
) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "admin", "manager");
  if (roleCheck) return roleCheck;

  const limited = await enforceRateLimit(request, {
    scope: "payment-action",
    limit: 30,
    windowSeconds: 60,
    identity: session.userId,
  });
  if (limited) return limited;

  const { id, paymentId } = await params;
  try {
    const rawBody: unknown = await request.json();
    if (!isRecord(rawBody)) return apiError("Invalid payment action", 400);

    const supabase = createAdminSupabaseClient();
    if (rawBody.action === "settle") {
      const method = optionalText(rawBody.method, 20)?.toUpperCase() ?? null;
      if (!isPaymentMethod(method)) {
        return apiError("Choose a payment method", 400);
      }
      const paidAt = optionalTimestamp(rawBody.paidAt);
      if (rawBody.paidAt && !paidAt) {
        return apiError("Invalid settlement date", 400);
      }

      const args = {
        p_booking_id: id,
        p_payment_id: paymentId,
        p_method: method,
        p_paid_at: paidAt,
        p_reference: optionalText(rawBody.reference, 160),
        p_actor_user_id: session.userId,
      } as unknown as SettleArgs;
      const { error } = await supabase.rpc("settle_booking_payment", args);
      if (error) return actionError(error);
      return apiSuccess({ ok: true });
    }

    if (rawBody.action === "void") {
      const reason = optionalText(rawBody.reason, 500);
      if (!reason) return apiError("Explain why this entry is being voided", 400);
      const args = {
        p_booking_id: id,
        p_payment_id: paymentId,
        p_reason: reason,
        p_actor_user_id: session.userId,
      } as VoidArgs;
      const { error } = await supabase.rpc("void_booking_payment", args);
      if (error) return actionError(error);
      return apiSuccess({ ok: true });
    }

    return apiError("Choose settle or void", 400);
  } catch (error) {
    console.error("PATCH booking payment:", error);
    return apiError("Could not update the payment", 500);
  }
}
