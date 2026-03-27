"use client";

import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { fadeUp, staggerContainer } from "@/animations/variants";
import { FloatingField, FloatingTextarea } from "@/components/auth/floating-field";
import { dashBtn, dashCard, dashLabel } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type FormValues = {
  businessName: string;
  category: string;
  shortBio: string;
  city: string;
  state: string;
  experience: string;
};

const categories = [
  "Photography",
  "Catering",
  "Music & DJ",
  "Decor & Design",
  "Makeup & Styling",
  "Travel & Logistics",
  "Venues",
  "Floral",
];

export default function VendorProfilePage() {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      businessName: "Lens & Light Studios",
      category: "Photography",
      shortBio:
        "Editorial destination wedding photography with a documentary heart—based in Mumbai, flying worldwide.",
      city: "Mumbai",
      state: "Maharashtra",
      experience: "8",
    },
  });

  const onSubmit = handleSubmit(async () => {
    try {
      await new Promise((r) => setTimeout(r, 600));
      toast.success("Profile saved");
    } catch {
      toast.error("Failed to save. Please try again.");
    }
  });

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div variants={fadeUp}>
        <p className={dashLabel}>Business</p>
        <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">Profile</h2>
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
              className="mt-3 w-full border-0 border-b border-charcoal/25 bg-transparent py-2 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
              {...register("category")}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
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
            {...register("experience")}
          />

          <button type="submit" className={dashBtn} disabled={isSubmitting}>
            Save Changes
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
