"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { UserProfile, useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { fadeUp, staggerContainer } from "@/animations/variants";
import { FloatingField } from "@/components/auth/floating-field";
import { TestAuthAccountNotice } from "@/components/testing/test-auth-account-notice";
import { dashBtn, dashCard, dashLabel } from "@/lib/dashboard-styles";

type BusinessForm = {
  businessName: string;
  phone: string;
  taxId: string;
  city: string;
  state: string;
  country: string;
};

export default function VendorSettingsPage() {
  const { user, isLoaded: clerkLoaded } = useUser();
  const testAuthEnabled =
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_ELYSIAN_TEST_AUTH_BYPASS === "1";
  const [loading, setLoading] = useState(true);
  const [hasVendorProfile, setHasVendorProfile] = useState(true);
  const [acceptingInquiries, setAcceptingInquiries] = useState(true);
  const [availabilitySaving, setAvailabilitySaving] = useState(false);

  const business = useForm<BusinessForm>({
    defaultValues: {
      businessName: "",
      phone: "",
      taxId: "",
      city: "",
      state: "",
      country: "India",
    },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/settings/vendor");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load settings");
        if (cancelled) return;
        const v = data.vendor;
        const u = data.user ?? {};
        setHasVendorProfile(!!v);
        setAcceptingInquiries(v?.acceptingInquiries ?? true);
        business.reset({
          businessName: v?.businessName ?? "",
          phone: u.phone ?? "",
          taxId: v?.taxId ?? "",
          city: v?.city ?? "",
          state: v?.state ?? "",
          country: v?.country ?? "India",
        });
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Could not load settings");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  const updateAvailability = async (next: boolean) => {
    const previous = acceptingInquiries;
    setAcceptingInquiries(next);
    setAvailabilitySaving(true);

    try {
      const res = await fetch("/api/settings/vendor", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acceptingInquiries: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Availability update failed");
      toast.success(next ? "New inquiries enabled" : "New inquiries paused");
    } catch (error) {
      setAcceptingInquiries(previous);
      toast.error(
        error instanceof Error ? error.message : "Could not update availability"
      );
    } finally {
      setAvailabilitySaving(false);
    }
  };

  if ((!testAuthEnabled && !clerkLoaded) || loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-charcoal/10" />
        <div className="h-40 border border-charcoal/8 bg-charcoal/5" />
      </div>
    );
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-10">
      <motion.div variants={fadeUp}>
        <p className={dashLabel}>Studio</p>
        <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">Settings</h2>
      </motion.div>

      <motion.section variants={fadeUp} className={dashCard}>
        <h3 className="font-display text-lg text-charcoal">Business info</h3>
        <p className="font-heading mt-2 text-sm text-slate">
          These fields update your vendor profile in the database. For portfolio, category, and bio, use the Profile
          page—this screen focuses on contact and location used for operations.
        </p>
        {!hasVendorProfile && (
          <p className="font-heading mt-4 border border-charcoal/10 bg-cream/40 px-4 py-3 text-sm text-charcoal">
            No vendor profile was found for your account. Complete signup or contact support before saving business
            details.
          </p>
        )}
        <form
          onSubmit={business.handleSubmit(async (values) => {
            try {
              const res = await fetch("/api/settings/vendor", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  businessName: values.businessName,
                  phone: values.phone,
                  taxId: values.taxId,
                  city: values.city,
                  state: values.state,
                  country: values.country,
                }),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error ?? "Save failed");
              toast.success("Business details saved");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Could not save");
            }
          })}
          className="mt-6 space-y-8"
        >
          <FloatingField id="vb-name" label="Business name" {...business.register("businessName")} />
          <div>
            <p className="font-accent mb-2 text-[10px] uppercase tracking-[0.2em] text-slate">Email</p>
            <p className="font-heading text-sm text-charcoal">{email || "—"}</p>
            <p className="font-heading mt-2 text-xs text-slate">Read-only. Change it under Account security.</p>
          </div>
          <FloatingField id="vb-phone" label="Phone" type="tel" {...business.register("phone")} />
          <FloatingField
            id="vb-tax-id"
            label="GST / tax ID"
            maxLength={64}
            autoCapitalize="characters"
            {...business.register("taxId", {
              maxLength: {
                value: 64,
                message: "Use 64 characters or fewer",
              },
              pattern: {
                value: /^[A-Za-z0-9 .:/_-]*$/,
                message: "Use letters, numbers, spaces, dots, slashes, colons, underscores, or hyphens",
              },
            })}
            error={business.formState.errors.taxId?.message}
          />
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            <FloatingField id="vb-city" label="City" {...business.register("city")} />
            <FloatingField id="vb-state" label="State" {...business.register("state")} />
          </div>
          <FloatingField id="vb-country" label="Country" {...business.register("country")} />
          <button
            type="submit"
            className={dashBtn}
            disabled={business.formState.isSubmitting || !hasVendorProfile}
          >
            Save changes
          </button>
        </form>
      </motion.section>

      <motion.section variants={fadeUp} className={dashCard}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className={dashLabel}>Availability</p>
            <h3 className="mt-2 font-display text-lg text-charcoal">
              {acceptingInquiries
                ? "Accepting new inquiries"
                : "New inquiries paused"}
            </h3>
            <p className="font-heading mt-2 max-w-2xl text-sm leading-relaxed text-slate">
              {acceptingInquiries
                ? "Your verified profile can appear in client discovery and receive new event bookings."
                : "Your existing bookings remain available, but clients cannot discover or add you to a new function."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={acceptingInquiries}
            disabled={availabilitySaving || !hasVendorProfile}
            onClick={() => void updateAvailability(!acceptingInquiries)}
            className="inline-flex min-w-44 items-center justify-between gap-4 border border-charcoal/15 bg-cream/30 px-4 py-3 text-left transition-colors hover:border-gold-primary disabled:pointer-events-none disabled:opacity-40"
          >
            <span className="font-accent text-[10px] uppercase tracking-[0.16em] text-charcoal">
              {availabilitySaving
                ? "Saving"
                : acceptingInquiries
                  ? "Open"
                  : "Paused"}
            </span>
            <span
              aria-hidden
              className={`relative h-6 w-11 rounded-full transition-colors ${
                acceptingInquiries ? "bg-sage" : "bg-charcoal/20"
              }`}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-ivory shadow-sm transition-transform ${
                  acceptingInquiries ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </span>
          </button>
        </div>
      </motion.section>

      <motion.section variants={fadeUp} className={dashCard}>
        <h3 className="font-display text-lg text-charcoal">Account security</h3>
        <p className="font-heading mt-2 text-sm text-slate">
          Password and email are managed by Clerk. Use the profile panel below.
        </p>
        <div className="mt-6 overflow-hidden border border-charcoal/10">
          {testAuthEnabled ? (
            <TestAuthAccountNotice />
          ) : (
            <UserProfile
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "shadow-none border-0",
                },
              }}
            />
          )}
        </div>
      </motion.section>
    </motion.div>
  );
}
