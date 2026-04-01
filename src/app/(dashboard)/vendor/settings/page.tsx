"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { UserProfile, useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { fadeUp, staggerContainer } from "@/animations/variants";
import { FloatingField } from "@/components/auth/floating-field";
import { dashBtn, dashCard, dashLabel } from "@/lib/dashboard-styles";

type BusinessForm = {
  businessName: string;
  phone: string;
  city: string;
  state: string;
  country: string;
};

export default function VendorSettingsPage() {
  const { user, isLoaded: clerkLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [hasVendorProfile, setHasVendorProfile] = useState(true);

  const business = useForm<BusinessForm>({
    defaultValues: {
      businessName: "",
      phone: "",
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
        business.reset({
          businessName: v?.businessName ?? "",
          phone: u.phone ?? "",
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

  if (!clerkLoaded || loading) {
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
          <div className="border border-charcoal/10 bg-cream/30 px-4 py-3">
            <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-slate">GST / tax ID</p>
            <p className="font-heading mt-2 text-sm text-slate">
              Tax identifiers are not stored on your vendor profile in this database yet. Keep GST on invoices and
              contracts outside the app until we add a dedicated field.
            </p>
          </div>
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
        <h3 className="font-display text-lg text-charcoal">Availability</h3>
        <p className="font-heading mt-2 text-sm text-slate">
          A &quot;pause new inquiries&quot; flag is not stored in the database yet. To manage demand, coordinate with
          your planner or hide individual services on the Services page until this feature ships.
        </p>
      </motion.section>

      <motion.section variants={fadeUp} className={dashCard}>
        <h3 className="font-display text-lg text-charcoal">Notifications</h3>
        <p className="font-heading mt-2 text-sm text-slate">
          Per-channel notification preferences are not stored yet. You will still receive booking and message alerts
          according to platform events.
        </p>
      </motion.section>

      <motion.section variants={fadeUp} className={dashCard}>
        <h3 className="font-display text-lg text-charcoal">Account security</h3>
        <p className="font-heading mt-2 text-sm text-slate">
          Password and email are managed by Clerk. Use the profile panel below.
        </p>
        <div className="mt-6 overflow-hidden border border-charcoal/10">
          <UserProfile
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none border-0",
              },
            }}
          />
        </div>
      </motion.section>
    </motion.div>
  );
}
