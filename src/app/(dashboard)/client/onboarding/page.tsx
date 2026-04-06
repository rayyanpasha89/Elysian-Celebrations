"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "@/animations/variants";
import { dashBtn, dashCard, dashLabel } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

const schema = z.object({
  coupleName: z.string().min(2, "Enter both names"),
  weddingDate: z.string().min(1, "Pick a date"),
  guestCount: z.number().min(1, "At least 1 guest"),
  destinationId: z.string().optional(),
  budgetTotal: z.number().min(50000, "Minimum ₹50,000"),
});

type FormValues = z.infer<typeof schema>;

const steps = [
  "Names",
  "Date",
  "Guests",
  "Destination",
  "Budget",
] as const;

export default function ClientOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [destinations, setDestinations] = useState<
    { id: string; name: string; country: string }[]
  >([]);
  const [destLoading, setDestLoading] = useState(true);

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      coupleName: "",
      weddingDate: "",
      guestCount: 120,
      destinationId: "",
      budgetTotal: 800000,
    },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/destinations");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        const list = (json.destinations ?? []).map(
          (d: { id: string; name: string; country: string }) => ({
            id: d.id,
            name: d.name,
            country: d.country,
          })
        );
        if (!cancelled) setDestinations(list);
      } catch {
        if (!cancelled) setDestinations([]);
      } finally {
        if (!cancelled) setDestLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fieldsForStep = (): (keyof FormValues)[] => {
    if (step === 0) return ["coupleName"];
    if (step === 1) return ["weddingDate"];
    if (step === 2) return ["guestCount"];
    if (step === 3) return [];
    return ["budgetTotal"];
  };

  const next = async () => {
    const ok = await trigger(fieldsForStep(), { shouldFocus: true });
    if (!ok) return;
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const back = () => setStep((s) => Math.max(s - 1, 0));

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const res = await fetch("/api/wedding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coupleName: values.coupleName,
          weddingDate: values.weddingDate,
          guestCount: values.guestCount,
          destinationId: values.destinationId || undefined,
          budgetTotal: values.budgetTotal,
        }),
      });
      const json = await res.json();
      if (res.status === 409) {
        // Wedding already exists — just go to dashboard
        router.replace("/client");
        return;
      }
      if (!res.ok) throw new Error(json.error ?? "Could not save");
      router.replace("/client");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Could not save. Please try again.");
      setLoading(false);
    }
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-xl"
    >
      <motion.header variants={fadeUp} className="border-b border-charcoal/8 pb-8">
        <p className={dashLabel}>Onboarding</p>
        <h1 className="font-display mt-2 text-3xl font-semibold text-charcoal">
          Plan your celebration
        </h1>
        <p className="font-heading mt-2 text-sm text-slate">
          Step {step + 1} of {steps.length} — {steps[step]}
        </p>
        <div className="mt-6 flex gap-1">
          {steps.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 bg-charcoal/10",
                i <= step && "bg-gold-primary"
              )}
            />
          ))}
        </div>
      </motion.header>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-10 space-y-8">
        <motion.div variants={fadeUp} className={cn(dashCard, "space-y-6")}>
          {step === 0 && (
            <div>
              <label htmlFor="coupleName" className={dashLabel}>
                Couple / wedding title
              </label>
              <input
                id="coupleName"
                {...register("coupleName")}
                className="mt-3 w-full border border-charcoal/15 bg-ivory px-4 py-3 font-heading text-sm outline-none focus:border-gold-primary"
                placeholder="Priya & Arjun"
              />
              {errors.coupleName && (
                <p className="mt-2 text-xs text-rose">{errors.coupleName.message}</p>
              )}
            </div>
          )}

          {step === 1 && (
            <div>
              <label htmlFor="weddingDate" className={dashLabel}>
                Wedding date
              </label>
              <input
                id="weddingDate"
                type="date"
                {...register("weddingDate")}
                className="mt-3 w-full border border-charcoal/15 bg-ivory px-4 py-3 font-heading text-sm outline-none focus:border-gold-primary"
              />
              {errors.weddingDate && (
                <p className="mt-2 text-xs text-rose">{errors.weddingDate.message}</p>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <label htmlFor="guestCount" className={dashLabel}>
                Estimated guest count
              </label>
              <input
                id="guestCount"
                type="number"
                min={1}
                {...register("guestCount", { valueAsNumber: true })}
                className="mt-3 w-full border border-charcoal/15 bg-ivory px-4 py-3 font-heading text-sm outline-none focus:border-gold-primary"
              />
              {errors.guestCount && (
                <p className="mt-2 text-xs text-rose">{errors.guestCount.message}</p>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <p className={dashLabel}>Destination preference</p>
              {destLoading ? (
                <p className="mt-3 text-sm text-slate">Loading destinations…</p>
              ) : (
                <select
                  {...register("destinationId")}
                  className="mt-3 w-full border border-charcoal/15 bg-ivory px-4 py-3 font-heading text-sm outline-none focus:border-gold-primary"
                >
                  <option value="">Decide later</option>
                  {destinations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}, {d.country}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {step === 4 && (
            <div>
              <label htmlFor="budgetTotal" className={dashLabel}>
                Total budget (INR)
              </label>
              <input
                id="budgetTotal"
                type="number"
                min={50000}
                step={10000}
                {...register("budgetTotal", { valueAsNumber: true })}
                className="mt-3 w-full border border-charcoal/15 bg-ivory px-4 py-3 font-heading text-sm outline-none focus:border-gold-primary"
              />
              {errors.budgetTotal && (
                <p className="mt-2 text-xs text-rose">{errors.budgetTotal.message}</p>
              )}
            </div>
          )}
        </motion.div>

        <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
          {step > 0 && (
            <button type="button" onClick={back} className={dashBtn}>
              Back
            </button>
          )}
          {step < steps.length - 1 && (
            <button type="button" onClick={next} className={dashBtn}>
              Continue
            </button>
          )}
          {step === steps.length - 1 && (
            <button type="submit" disabled={loading} className={dashBtn}>
              {loading ? "Saving…" : "Finish & go to dashboard"}
            </button>
          )}
        </motion.div>
      </form>
    </motion.div>
  );
}
