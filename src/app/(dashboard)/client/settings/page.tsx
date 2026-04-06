"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { UserProfile, useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { fadeUp, staggerContainer } from "@/animations/variants";
import { FloatingField } from "@/components/auth/floating-field";
import { dashBtn, dashCard, dashLabel } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type ProfileForm = { name: string; phone: string };
type WeddingForm = {
  partnerName: string;
  date: string;
  guestCount: string;
  destinationId: string;
};

export default function ClientSettingsPage() {
  const { user, isLoaded: clerkLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [hasWedding, setHasWedding] = useState(false);

  const profile = useForm<ProfileForm>({
    defaultValues: { name: "", phone: "" },
  });
  const wedding = useForm<WeddingForm>({
    defaultValues: { partnerName: "", date: "", guestCount: "", destinationId: "" },
  });

  const [destinationOptions, setDestinationOptions] = useState<
    { id: string; name: string; country: string; slug: string }[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/settings/client");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load settings");
        if (cancelled) return;
        const u = data.user ?? {};
        profile.reset({
          name: u.name ?? "",
          phone: u.phone ?? "",
        });
        const cp = data.clientProfile;
        const w = data.wedding;
        setHasWedding(!!w?.id);
        const wd = w?.date ?? cp?.weddingDate;
        const dateStr =
          typeof wd === "string" && wd.length > 0
            ? wd.slice(0, 10)
            : "";
        wedding.reset({
          partnerName: cp?.partnerName ?? "",
          date: dateStr,
          guestCount: cp?.guestCount != null ? String(cp.guestCount) : "",
          destinationId: w?.destinationId ?? "",
        });
        setDestinationOptions(data.destinationOptions ?? []);
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
        <p className={dashLabel}>Account</p>
        <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">Settings</h2>
      </motion.div>

      <motion.section variants={fadeUp} className={dashCard}>
        <h3 className="font-display text-lg text-charcoal">Profile info</h3>
        <p className="font-heading mt-2 text-sm text-slate">
          Name and phone are saved to your Elysian profile. Email is managed by your sign-in account (see Account
          security below).
        </p>
        <form
          onSubmit={profile.handleSubmit(async (values) => {
            try {
              const res = await fetch("/api/settings/client", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: values.name, phone: values.phone }),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error ?? "Save failed");
              toast.success("Profile saved");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Could not save");
            }
          })}
          className="mt-6 space-y-8"
        >
          <FloatingField id="set-name" label="Name" {...profile.register("name")} />
          <div>
            <p className={cn(dashLabel, "mb-2")}>Email</p>
            <p className="font-heading text-sm text-charcoal">{email || "—"}</p>
            <p className="font-heading mt-2 text-xs text-slate">Read-only. Change it under Account security.</p>
          </div>
          <FloatingField id="set-phone" label="Phone" type="tel" {...profile.register("phone")} />
          <button type="submit" className={dashBtn} disabled={profile.formState.isSubmitting}>
            Save changes
          </button>
        </form>
      </motion.section>

      <motion.section variants={fadeUp} className={dashCard}>
        <h3 className="font-display text-lg text-charcoal">Wedding details</h3>
        <p className="font-heading mt-2 text-sm text-slate">
          Updates your client profile and, when a wedding exists, the wedding record (date and destination).
        </p>
        {!hasWedding && (
          <p className="font-heading mt-3 text-sm text-charcoal/80">
            You don&apos;t have a wedding record yet—destination and shared wedding date will apply after onboarding
            or when a wedding is created. Partner name and guest count still save here.
          </p>
        )}
        <form
          onSubmit={wedding.handleSubmit(async (values) => {
            try {
              const res = await fetch("/api/settings/client", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  partnerName: values.partnerName,
                  weddingDate: values.date || null,
                  guestCount: values.guestCount === "" ? null : Number(values.guestCount),
                  destinationId: values.destinationId || null,
                }),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error ?? "Save failed");
              toast.success("Wedding details saved");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Could not save");
            }
          })}
          className="mt-6 space-y-8"
        >
          <FloatingField id="partner" label="Partner / couple name" {...wedding.register("partnerName")} />
          <FloatingField id="wed-date" label="Wedding date" type="date" {...wedding.register("date")} />
          <FloatingField id="wed-guests" label="Guest count" type="number" min={0} {...wedding.register("guestCount")} />
          <div>
            <label htmlFor="wed-dest" className={cn(dashLabel, "block")}>
              Destination
            </label>
            <select
              id="wed-dest"
              disabled={!hasWedding}
              className="mt-3 w-full border border-charcoal/15 bg-ivory px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary disabled:cursor-not-allowed disabled:opacity-60"
              {...wedding.register("destinationId")}
            >
              <option value="">None selected</option>
              {destinationOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}, {d.country}
                </option>
              ))}
            </select>
            {!hasWedding && (
              <p className="font-heading mt-2 text-xs text-slate">Available after a wedding record exists.</p>
            )}
          </div>
          <button type="submit" className={dashBtn} disabled={wedding.formState.isSubmitting}>
            Save changes
          </button>
        </form>
      </motion.section>

      <motion.section variants={fadeUp} className={dashCard}>
        <h3 className="font-display text-lg text-charcoal">Account security</h3>
        <p className="font-heading mt-2 text-sm text-slate">
          Password, email, and connected accounts are managed by Clerk. Use the profile panel below—changes apply
          immediately to your sign-in.
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
