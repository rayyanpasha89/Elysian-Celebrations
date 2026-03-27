"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { fadeUp, staggerContainer } from "@/animations/variants";
import { FloatingField } from "@/components/auth/floating-field";
import { dashBtn, dashCard, dashLabel } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

const featuredDestinations = ["Udaipur", "Goa", "Jaipur", "Bali", "Santorini"];

export default function AdminSettingsPage() {
  const form = useForm({
    defaultValues: {
      platformName: "Elysian Celebrations",
      contactEmail: "hello@elysian.test",
      commission: "12",
    },
  });

  const [featuredSaving, setFeaturedSaving] = useState(false);

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-10">
      <motion.div variants={fadeUp}>
        <p className={dashLabel}>System</p>
        <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">Settings</h2>
      </motion.div>

      <motion.section variants={fadeUp} className={dashCard}>
        <h3 className="font-display text-lg text-charcoal">Platform</h3>
        <form
          onSubmit={form.handleSubmit(async () => {
            try {
              await new Promise((r) => setTimeout(r, 600));
              toast.success("Platform settings saved");
            } catch {
              toast.error("Failed to save. Please try again.");
            }
          })}
          className="mt-6 space-y-8"
        >
          <FloatingField id="plat-name" label="Platform name" {...form.register("platformName")} />
          <FloatingField id="plat-email" label="Contact email" type="email" {...form.register("contactEmail")} />
          <FloatingField
            id="plat-comm"
            label="Commission rate (%)"
            type="number"
            min={0}
            max={100}
            {...form.register("commission")}
          />
          <button type="submit" className={dashBtn} disabled={form.formState.isSubmitting}>
            Save Changes
          </button>
        </form>
      </motion.section>

      <motion.section variants={fadeUp} className={dashCard}>
        <h3 className="font-display text-lg text-charcoal">Featured destinations</h3>
        <p className="font-heading mt-2 text-sm text-slate">Shown on marketing home and discovery modules.</p>
        <ul className="mt-6 list-none space-y-2 pl-0">
          {featuredDestinations.map((name) => (
            <li key={name}>
              <label className="flex cursor-pointer items-center justify-between border border-charcoal/10 px-4 py-3 transition-colors hover:border-charcoal/20">
                <span className="font-heading text-sm text-charcoal">{name}</span>
                <input type="checkbox" defaultChecked className="h-4 w-4 border border-charcoal/30 accent-gold-primary" />
              </label>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className={cn(dashBtn, "mt-8")}
          disabled={featuredSaving}
          onClick={async () => {
            setFeaturedSaving(true);
            try {
              await new Promise((r) => setTimeout(r, 500));
              toast.success("Featured destinations saved");
            } catch {
              toast.error("Failed to save. Please try again.");
            } finally {
              setFeaturedSaving(false);
            }
          }}
        >
          Save Changes
        </button>
      </motion.section>
    </motion.div>
  );
}
