"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "@/animations/variants";
import { FloatingField, FloatingTextarea } from "@/components/auth/floating-field";
import { dashBtn, dashCard, dashLabel } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type FormValues = {
  businessName: string;
  categoryId: string;
  shortBio: string;
  city: string;
  state: string;
  experience: number;
};

type CategoryOpt = { id: string; name: string; slug: string };

export default function VendorProfilePage() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryOpt[]>([]);
  const [hasProfile, setHasProfile] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      businessName: "",
      categoryId: "",
      shortBio: "",
      city: "",
      state: "",
      experience: 0,
    },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/vendor/profile");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        if (!cancelled) {
          setCategories(json.categories ?? []);
          const p = json.profile;
          setHasProfile(Boolean(p));
          if (p) {
            reset({
              businessName: p.businessName ?? "",
              categoryId: p.categoryId ?? "",
              shortBio: p.shortBio ?? "",
              city: p.city ?? "",
              state: p.state ?? "",
              experience: p.experience ?? 0,
            });
          }
        }
      } catch {
        if (!cancelled) toast.error("Could not load profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const res = await fetch("/api/vendor/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: values.businessName,
          categoryId: values.categoryId,
          shortBio: values.shortBio,
          city: values.city,
          state: values.state,
          experience: values.experience,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setHasProfile(true);
      toast.success("Profile saved");
    } catch {
      toast.error("Failed to save. Please try again.");
    }
  });

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-10 w-48 bg-charcoal/10" />
        <div className="h-96 border border-charcoal/8 bg-charcoal/5" />
      </div>
    );
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div variants={fadeUp}>
        <p className={dashLabel}>Business</p>
        <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">
          {hasProfile ? "Profile" : "Create your studio profile"}
        </h2>
        <p className="mt-2 max-w-2xl font-heading text-sm text-slate">
          {hasProfile
            ? "Keep your public business details current so couples can discover and trust your brand."
            : "Set up the essentials first. Once this is saved, your vendor workspace will start behaving like a real business profile instead of a placeholder shell."}
        </p>
      </motion.div>

      <motion.form
        variants={fadeUp}
        onSubmit={onSubmit}
        className="mt-10 grid gap-12 lg:grid-cols-2"
      >
        <div className="space-y-6">
          <div className={dashCard}>
            <div className="aspect-[16/10] border border-charcoal/10 bg-gradient-to-br from-midnight/70 to-charcoal/30" />
            <p className={cn(dashLabel, "mt-4")}>Cover</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {["01", "02", "03", "04"].map((id) => (
              <div
                key={id}
                className="aspect-square border border-charcoal/10 bg-gradient-to-br from-cream to-charcoal/10"
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => toast.info("Portfolio uploads will be available once file storage is configured.")}
            className="flex aspect-square w-full items-center justify-center border border-dashed border-charcoal/25 bg-transparent font-accent text-[10px] uppercase tracking-[0.2em] text-slate transition-colors hover:border-gold-primary hover:text-gold-dark"
          >
            Add to portfolio
          </button>
        </div>

        <div className="space-y-8">
          <FloatingField id="biz-name" label="Business name" {...register("businessName")} />

          <div className="relative">
            <label htmlFor="category" className={cn(dashLabel, "block")}>
              Category
            </label>
            <select
              id="category"
              required
              className="mt-3 w-full border-0 border-b border-charcoal/25 bg-transparent py-2 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
              {...register("categoryId")}
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <FloatingTextarea id="bio" label="Short bio" rows={5} {...register("shortBio")} />

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            <FloatingField id="city" label="City" {...register("city")} />
            <FloatingField id="state" label="State" {...register("state")} />
          </div>

          <FloatingField
            id="experience"
            label="Experience (years)"
            type="number"
            min={0}
            {...register("experience", { valueAsNumber: true })}
          />

          <button type="submit" className={dashBtn} disabled={isSubmitting}>
            Save Changes
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
