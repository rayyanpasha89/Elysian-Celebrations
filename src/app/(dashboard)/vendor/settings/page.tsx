"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { fadeUp, staggerContainer } from "@/animations/variants";
import { FloatingField } from "@/components/auth/floating-field";
import { dashBtn, dashCard, dashLabel } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

function ToggleRow({ id, label, defaultChecked }: { id: string; label: string; defaultChecked?: boolean }) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center justify-between border border-charcoal/10 px-4 py-3 transition-colors hover:border-charcoal/20"
    >
      <span className="font-heading text-sm text-charcoal">{label}</span>
      <input
        id={id}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="h-4 w-4 border border-charcoal/30 accent-gold-primary"
      />
    </label>
  );
}

export default function VendorSettingsPage() {
  const business = useForm({
    defaultValues: {
      name: "Lens & Light Studios",
      email: "hello@lenslight.studio",
      phone: "+91 98200 11223",
      gst: "27AAAAA0000A1Z5",
    },
  });

  const password = useForm({
    defaultValues: { current: "", next: "", confirm: "" },
  });

  const [availSaving, setAvailSaving] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-10">
      <motion.div variants={fadeUp}>
        <p className={dashLabel}>Studio</p>
        <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">Settings</h2>
      </motion.div>

      <motion.section variants={fadeUp} className={dashCard}>
        <h3 className="font-display text-lg text-charcoal">Business info</h3>
        <form
          onSubmit={business.handleSubmit(async () => {
            try {
              await new Promise((r) => setTimeout(r, 600));
              toast.success("Business details saved");
            } catch {
              toast.error("Failed to save. Please try again.");
            }
          })}
          className="mt-6 space-y-8"
        >
          <FloatingField id="vb-name" label="Business name" {...business.register("name")} />
          <FloatingField id="vb-email" label="Email" type="email" {...business.register("email")} />
          <FloatingField id="vb-phone" label="Phone" type="tel" {...business.register("phone")} />
          <FloatingField id="vb-gst" label="GST number" {...business.register("gst")} />
          <button type="submit" className={dashBtn} disabled={business.formState.isSubmitting}>
            Save Changes
          </button>
        </form>
      </motion.section>

      <motion.section variants={fadeUp} className={dashCard}>
        <h3 className="font-display text-lg text-charcoal">Availability</h3>
        <p className="font-heading mt-2 text-sm text-slate">When off, new inquiries are paused on your profile.</p>
        <div className="mt-6">
          <ToggleRow id="avail" label="Available for new bookings" defaultChecked />
        </div>
        <button
          type="button"
          className={cn(dashBtn, "mt-8")}
          disabled={availSaving}
          onClick={async () => {
            setAvailSaving(true);
            try {
              await new Promise((r) => setTimeout(r, 500));
              toast.success("Availability saved");
            } catch {
              toast.error("Failed to save. Please try again.");
            } finally {
              setAvailSaving(false);
            }
          }}
        >
          Save Changes
        </button>
      </motion.section>

      <motion.section variants={fadeUp} className={dashCard}>
        <h3 className="font-display text-lg text-charcoal">Notifications</h3>
        <div className="mt-6 space-y-3">
          <ToggleRow id="vn-inq" label="New inquiries" defaultChecked />
          <ToggleRow id="vn-msg" label="Messages" defaultChecked />
          <ToggleRow id="vn-book" label="Booking updates" defaultChecked />
        </div>
        <button
          type="button"
          className={cn(dashBtn, "mt-8")}
          disabled={notifSaving}
          onClick={async () => {
            setNotifSaving(true);
            try {
              await new Promise((r) => setTimeout(r, 500));
              toast.success("Notification preferences saved");
            } catch {
              toast.error("Failed to save. Please try again.");
            } finally {
              setNotifSaving(false);
            }
          }}
        >
          Save Changes
        </button>
      </motion.section>

      <motion.section variants={fadeUp} className={dashCard}>
        <h3 className="font-display text-lg text-charcoal">Password</h3>
        <form
          onSubmit={password.handleSubmit(async (d) => {
            if (d.next !== d.confirm) {
              toast.error("New passwords do not match.");
              return;
            }
            try {
              await new Promise((r) => setTimeout(r, 600));
              toast.success("Password updated");
              password.reset({ current: "", next: "", confirm: "" });
            } catch {
              toast.error("Failed to save. Please try again.");
            }
          })}
          className="mt-6 space-y-8"
        >
          <FloatingField id="vpw-c" label="Current password" type="password" {...password.register("current")} />
          <FloatingField id="vpw-n" label="New password" type="password" {...password.register("next")} />
          <FloatingField id="vpw-x" label="Confirm password" type="password" {...password.register("confirm")} />
          <button type="submit" className={dashBtn} disabled={password.formState.isSubmitting}>
            Save Changes
          </button>
        </form>
      </motion.section>
    </motion.div>
  );
}
