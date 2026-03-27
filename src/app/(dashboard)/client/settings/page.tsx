"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { fadeUp, staggerContainer } from "@/animations/variants";
import { FloatingField } from "@/components/auth/floating-field";
import { dashBtn, dashCard, dashLabel } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type ProfileForm = { name: string; email: string; phone: string };
type WeddingForm = { date: string; guestCount: string; destination: string };

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

export default function ClientSettingsPage() {
  const profile = useForm<ProfileForm>({
    defaultValues: { name: "Priya Sharma", email: "priya@email.com", phone: "+91 98765 43210" },
  });
  const wedding = useForm<WeddingForm>({
    defaultValues: { date: "2026-02-14", guestCount: "180", destination: "Udaipur" },
  });
  const password = useForm<{ current: string; next: string; confirm: string }>({
    defaultValues: { current: "", next: "", confirm: "" },
  });

  const [notifSaving, setNotifSaving] = useState(false);

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-10">
      <motion.div variants={fadeUp}>
        <p className={dashLabel}>Account</p>
        <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">Settings</h2>
      </motion.div>

      <motion.section variants={fadeUp} className={dashCard}>
        <h3 className="font-display text-lg text-charcoal">Profile info</h3>
        <form
          onSubmit={profile.handleSubmit(async () => {
            try {
              await new Promise((r) => setTimeout(r, 600));
              toast.success("Profile updated");
            } catch {
              toast.error("Failed to save. Please try again.");
            }
          })}
          className="mt-6 space-y-8"
        >
          <FloatingField id="set-name" label="Name" {...profile.register("name")} />
          <FloatingField id="set-email" label="Email" type="email" {...profile.register("email")} />
          <FloatingField id="set-phone" label="Phone" type="tel" {...profile.register("phone")} />
          <button type="submit" className={dashBtn} disabled={profile.formState.isSubmitting}>
            Save Changes
          </button>
        </form>
      </motion.section>

      <motion.section variants={fadeUp} className={dashCard}>
        <h3 className="font-display text-lg text-charcoal">Wedding details</h3>
        <form
          onSubmit={wedding.handleSubmit(async () => {
            try {
              await new Promise((r) => setTimeout(r, 600));
              toast.success("Wedding details saved");
            } catch {
              toast.error("Failed to save. Please try again.");
            }
          })}
          className="mt-6 space-y-8"
        >
          <FloatingField id="wed-date" label="Wedding date" type="date" {...wedding.register("date")} />
          <FloatingField id="wed-guests" label="Guest count" {...wedding.register("guestCount")} />
          <FloatingField id="wed-dest" label="Destination" {...wedding.register("destination")} />
          <button type="submit" className={dashBtn} disabled={wedding.formState.isSubmitting}>
            Save Changes
          </button>
        </form>
      </motion.section>

      <motion.section variants={fadeUp} className={dashCard}>
        <h3 className="font-display text-lg text-charcoal">Notifications</h3>
        <p className="font-heading mt-2 text-sm text-slate">Choose how we reach you about planning updates.</p>
        <div className="mt-6 space-y-3">
          <ToggleRow id="notif-email" label="Email" defaultChecked />
          <ToggleRow id="notif-sms" label="SMS" />
          <ToggleRow id="notif-push" label="Push" defaultChecked />
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
          <FloatingField id="pw-current" label="Current password" type="password" {...password.register("current")} />
          <FloatingField id="pw-next" label="New password" type="password" {...password.register("next")} />
          <FloatingField id="pw-confirm" label="Confirm new password" type="password" {...password.register("confirm")} />
          <button type="submit" className={dashBtn} disabled={password.formState.isSubmitting}>
            Save Changes
          </button>
        </form>
      </motion.section>
    </motion.div>
  );
}
