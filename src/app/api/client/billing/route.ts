import { NextResponse } from "next/server";
import { apiError, apiSuccess, getAuthSession, requireRole } from "@/lib/api-utils";
import { summarizeBillingInvoices } from "@/lib/billing";
import {
  billingCapability,
  billingInvoiceView,
  CLIENT_BILLING_SELECT,
  type RawBillingInvoice,
} from "@/lib/billing-server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "client");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();
    const { data: profile, error: profileError } = await supabase
      .from("client_profiles")
      .select("id")
      .eq("user_id", session.userId)
      .maybeSingle();

    if (profileError) {
      console.error("Client billing profile:", profileError);
      return apiError("Billing could not be loaded", 500);
    }

    if (!profile) {
      return apiSuccess({
        invoices: [],
        summary: summarizeBillingInvoices([]),
        capability: billingCapability(),
        needsOnboarding: true,
      });
    }

    const { data, error } = await supabase
      .from("billing_invoices")
      .select(CLIENT_BILLING_SELECT)
      .eq("client_profile_id", profile.id)
      .order("due_date", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Client billing invoices:", error);
      return apiError("Billing could not be loaded", 500);
    }

    const invoices = (data ?? []).map((row) =>
      billingInvoiceView(row as unknown as RawBillingInvoice)
    );

    return apiSuccess({
      invoices,
      summary: summarizeBillingInvoices(invoices),
      capability: billingCapability(),
      needsOnboarding: false,
    });
  } catch (error) {
    console.error("GET /api/client/billing:", error);
    return apiError("Billing could not be loaded", 500);
  }
}
