import "server-only";

import {
  ELYSIAN_COLLECTION_MODEL,
  type BillingCapability,
  type ElysianCollectionModel,
} from "@/lib/billing";

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
  readonly collectionModel: ElysianCollectionModel;
  createCheckout(request: BillingCheckoutRequest): Promise<BillingCheckoutSession>;
  verifyWebhook(rawBody: string, headers: Headers): Promise<VerifiedBillingWebhook>;
}

export function activeBillingGateway(): BillingGateway | null {
  // Provider activation is deliberately explicit. Add the chosen adapter here
  // only after its marketplace KYC, hosted checkout, and vendor-settlement
  // agreement are approved for the full-client-price collection model.
  return null;
}

export function billingGatewayCapability(): BillingCapability {
  const requestedProvider = process.env.ELYSIAN_BILLING_PROVIDER?.trim() || null;
  const gateway = activeBillingGateway();
  if (gateway) {
    return {
      onlineCheckout: true,
      provider: gateway.provider,
      collectionModel: gateway.collectionModel,
      reason: "Secure online checkout is active for issued installments.",
    };
  }

  return {
    onlineCheckout: false,
    provider: requestedProvider,
    collectionModel: ELYSIAN_COLLECTION_MODEL.id,
    reason: requestedProvider
      ? `${requestedProvider} is selected for full-price collection, but its verified checkout, KYC, and settlement adapter is not activated.`
      : "Elysian collects the complete published client price. Until an approved marketplace gateway is activated, operations will confirm the payment channel for each installment.",
  };
}
