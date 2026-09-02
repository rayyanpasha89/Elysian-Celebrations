import "server-only";

import type { BillingCapability } from "@/lib/billing";

export type BillingCheckoutRequest = {
  invoiceId: string;
  invoiceNumber: string;
  amountMinor: number;
  currency: "INR";
  idempotencyKey: string;
  clientName: string;
  clientEmail: string | null;
  returnUrl: string;
};

export type BillingCheckoutSession = {
  provider: string;
  providerOrderId: string;
  checkoutUrl: string;
  expiresAt: string | null;
};

export type VerifiedBillingWebhook = {
  providerEventId: string;
  eventType: string;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  status: "CAPTURED" | "FAILED" | "IGNORED";
  occurredAt: string;
  failureCode?: string | null;
  failureMessage?: string | null;
};

/**
 * A gateway implementation must verify its webhook signature before returning
 * a normalized event. Raw webhook bodies must never be persisted.
 */
export interface BillingGateway {
  readonly provider: string;
  createCheckout(request: BillingCheckoutRequest): Promise<BillingCheckoutSession>;
  verifyWebhook(rawBody: string, headers: Headers): Promise<VerifiedBillingWebhook>;
}

export function activeBillingGateway(): BillingGateway | null {
  // Provider activation is deliberately explicit. Add the chosen adapter here
  // only after the commercial collection/settlement model and KYC account are confirmed.
  return null;
}

export function billingGatewayCapability(): BillingCapability {
  const requestedProvider = process.env.ELYSIAN_BILLING_PROVIDER?.trim() || null;
  const gateway = activeBillingGateway();
  if (gateway) {
    return {
      onlineCheckout: true,
      provider: gateway.provider,
      reason: "Secure online checkout is active for issued installments.",
    };
  }

  return {
    onlineCheckout: false,
    provider: requestedProvider,
    reason: requestedProvider
      ? `${requestedProvider} is selected but its verified checkout and webhook adapter is not activated.`
      : "Online checkout is not active yet. Elysian operations will confirm the approved payment method for each installment.",
  };
}
