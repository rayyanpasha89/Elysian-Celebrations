"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAnimation } from "framer-motion";
import { motion } from "framer-motion";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { destinations } from "@/data/destinations";
import { cn } from "@/lib/utils";

const contactSchema = z.object({
  name: z.string().min(2, "Please enter your name").max(120),
  email: z.string().email("Enter a valid email").max(254),
  phone: z.string().min(10, "Enter a valid phone number").max(40),
  weddingDate: z.string().min(1, "Choose a date"),
  guestCount: z
    .string()
    .min(1, "Enter guest count")
    .refine((s) => /^\d+$/.test(s), "Numbers only")
    .transform((s) => parseInt(s, 10))
    .pipe(z.number().min(1, "At least 1 guest").max(100_000)),
  destination: z.string().min(1, "Select a destination").max(120),
  message: z
    .string()
    .min(10, "Tell us more (at least 10 characters)")
    .max(4_000, "Please keep the brief under 4,000 characters"),
});

type FormInput = z.input<typeof contactSchema>;
type FormOutput = z.output<typeof contactSchema>;

const EVENT_TYPE_OPTIONS = [
  { value: "wedding", label: "Wedding" },
  { value: "corporate", label: "Corporate" },
  { value: "social", label: "Social & Gala" },
  { value: "retreat", label: "Retreat" },
  { value: "other", label: "Other" },
] as const;

// Maps the ?type= value the packages CTA sends to our chip values.
const TYPE_PARAM_MAP: Record<string, string> = {
  weddings: "wedding",
  corporate: "corporate",
  social: "social",
  retreats: "retreat",
};

const fieldClass =
  "peer w-full border border-charcoal/10 bg-ivory/60 px-4 pb-2.5 pt-6 text-charcoal outline-none transition-all duration-300 focus:border-gold-primary/60 focus:bg-ivory focus:shadow-[0_0_0_3px_rgba(201,169,110,0.08)]";

const labelClass =
  "pointer-events-none absolute left-4 top-1/2 origin-left -translate-y-1/2 text-slate transition-all duration-200 peer-focus:top-3 peer-focus:-translate-y-0 peer-focus:text-xs peer-focus:text-gold-dark peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:-translate-y-0 peer-[:not(:placeholder-shown)]:text-xs";

export function ContactForm() {
  const controls = useAnimation();
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [eventType, setEventType] = useState<string>("");
  const [tierInterest, setTierInterest] = useState<string>("");

  // Prefill the concierge brief from the packages CTA (?type=&tier=). Reading
  // the URL is a one-time sync from an external system on mount; state starts
  // empty so SSR/hydration stay aligned.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get("type");
    const tier = params.get("tier");
    const nextType = type && TYPE_PARAM_MAP[type] ? TYPE_PARAM_MAP[type] : "";
    /* eslint-disable react-hooks/set-state-in-effect -- one-time read of the browser URL */
    if (nextType) setEventType(nextType);
    if (tier) setTierInterest(tier);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      weddingDate: "",
      guestCount: "",
      destination: "",
      message: "",
    },
  });

  const onInvalid = async () => {
    await controls.start({
      x: [0, -10, 10, -8, 8, -5, 5, 0],
      transition: { duration: 0.45, ease: [0.36, 0.07, 0.19, 0.97] },
    });
    controls.set({ x: 0 });
  };

  const onSubmit = async (data: FormOutput) => {
    setStatus("loading");
    // Thread the concierge selections into the message so they reach the team
    // without changing the inquiry schema.
    const contextLines: string[] = [];
    const typeLabel = EVENT_TYPE_OPTIONS.find((opt) => opt.value === eventType)?.label;
    if (typeLabel) contextLines.push(`Event type: ${typeLabel}`);
    if (tierInterest) {
      contextLines.push(
        `Interested in: ${tierInterest.charAt(0).toUpperCase()}${tierInterest.slice(1)} package`
      );
    }
    const message = contextLines.length
      ? `${contextLines.join("\n")}\n\n${data.message}`
      : data.message;
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          destination: data.destination,
          weddingDate: data.weddingDate,
          guestCount: data.guestCount,
          message,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(
          typeof json.error === "string" ? json.error : "Failed to send. Please try again."
        );
        setStatus("idle");
        return;
      }
      toast.success("Message sent — we will be in touch shortly.");
      setStatus("success");
      reset();
      await new Promise((r) => setTimeout(r, 2200));
    } catch {
      toast.error("Failed to send. Please try again.");
      setStatus("idle");
      return;
    }
    setStatus("idle");
  };

  const weddingDate = useWatch({ control, name: "weddingDate" });
  const destination = useWatch({ control, name: "destination" });
  const dateLabelFloating = Boolean(weddingDate);
  const destLabelFloating = Boolean(destination);

  return (
    <motion.form
      animate={controls}
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      className="mx-auto max-w-xl space-y-6"
      noValidate
    >
      <div>
        <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-slate">
          What are you planning?
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {EVENT_TYPE_OPTIONS.map((opt) => {
            const active = eventType === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={active}
                onClick={() => setEventType(active ? "" : opt.value)}
                className={cn(
                  "border px-3.5 py-2 font-accent text-[10px] uppercase tracking-[0.16em] transition-colors",
                  active
                    ? "border-gold-primary bg-gold-primary/12 text-charcoal"
                    : "border-charcoal/12 bg-ivory/60 text-slate hover:border-gold-primary/45 hover:text-charcoal"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="relative">
          <input
            id="contact-name"
            type="text"
            autoComplete="name"
            maxLength={120}
            placeholder=" "
            className={cn(fieldClass)}
            {...register("name")}
          />
          <label htmlFor="contact-name" className={cn(labelClass, "font-sans text-[length:var(--text-body)]")}>
            Name
          </label>
          {errors.name && (
            <p className="font-sans mt-1 text-xs text-error" role="alert">
              {errors.name.message}
            </p>
          )}
        </div>

        <div className="relative">
          <input
            id="contact-email"
            type="email"
            autoComplete="email"
            maxLength={254}
            placeholder=" "
            className={cn(fieldClass)}
            {...register("email")}
          />
          <label htmlFor="contact-email" className={cn(labelClass, "font-sans text-[length:var(--text-body)]")}>
            Email
          </label>
          {errors.email && (
            <p className="font-sans mt-1 text-xs text-error" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="relative">
          <input
            id="contact-phone"
            type="tel"
            autoComplete="tel"
            maxLength={40}
            placeholder=" "
            className={cn(fieldClass)}
            {...register("phone")}
          />
          <label htmlFor="contact-phone" className={cn(labelClass, "font-sans text-[length:var(--text-body)]")}>
            Phone
          </label>
          {errors.phone && (
            <p className="font-sans mt-1 text-xs text-error" role="alert">
              {errors.phone.message}
            </p>
          )}
        </div>

        <div className="relative">
          <input
            id="contact-wedding-date"
            type="date"
            placeholder=" "
            className={cn(fieldClass)}
            {...register("weddingDate")}
          />
          <label
            htmlFor="contact-wedding-date"
            className={cn(
              labelClass,
              "font-sans text-[length:var(--text-body)]",
              dateLabelFloating && "top-3 -translate-y-0 text-xs text-gold-dark",
            )}
          >
            Event date
          </label>
          {errors.weddingDate && (
            <p className="font-sans mt-1 text-xs text-error" role="alert">
              {errors.weddingDate.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="relative">
          <input
            id="contact-guest-count"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder=" "
            className={cn(fieldClass)}
            {...register("guestCount")}
          />
          <label
            htmlFor="contact-guest-count"
            className={cn(labelClass, "font-sans text-[length:var(--text-body)]")}
          >
            Guest count
          </label>
          {errors.guestCount && (
            <p className="font-sans mt-1 text-xs text-error" role="alert">
              {errors.guestCount.message}
            </p>
          )}
        </div>

        <div className="relative">
          <select
            id="contact-destination"
            defaultValue=""
            className={cn(
              fieldClass,
              "peer appearance-none bg-cream/40 pt-6 pb-2.5 pr-10",
            )}
            {...register("destination")}
          >
            <option value="" disabled>
              Select…
            </option>
            {destinations.map((d) => (
              <option key={d.id} value={d.slug}>
                {d.name}, {d.country}
              </option>
            ))}
          </select>
          <label
            htmlFor="contact-destination"
            className={cn(
              labelClass,
              "font-sans text-[length:var(--text-body)]",
              "peer-focus:top-3 peer-focus:-translate-y-0 peer-focus:text-xs peer-focus:text-gold-dark",
              destLabelFloating && "top-3 -translate-y-0 text-xs text-gold-dark",
            )}
          >
            Preferred destination
          </label>
          {errors.destination && (
            <p className="font-sans mt-1 text-xs text-error" role="alert">
              {errors.destination.message}
            </p>
          )}
        </div>
      </div>

      <div className="relative">
        <textarea
          id="contact-message"
          rows={4}
          maxLength={4_000}
          placeholder=" "
          className={cn(fieldClass, "min-h-[140px] resize-y pt-7")}
          {...register("message")}
        />
        <label
          htmlFor="contact-message"
          className={cn(
            labelClass,
            "top-6 -translate-y-0 peer-focus:top-3 peer-[:not(:placeholder-shown)]:top-3",
            "font-sans text-[length:var(--text-body)]",
          )}
        >
          Message
        </label>
        {errors.message && (
          <p className="font-sans mt-1 text-xs text-error" role="alert">
            {errors.message.message}
          </p>
        )}
      </div>

      <motion.button
        type="submit"
        disabled={status === "loading" || status === "success"}
        className={cn(
          "font-accent relative w-full overflow-hidden px-6 py-4 text-[11px] uppercase tracking-[0.25em] text-charcoal",
          "bg-gradient-to-r from-gold-light via-gold-primary to-gold-light shadow-[var(--shadow-gold)]",
          "disabled:cursor-not-allowed disabled:opacity-90",
        )}
        whileHover={status === "idle" ? { scale: 1.01 } : undefined}
        whileTap={status === "idle" ? { scale: 0.99 } : undefined}
      >
        <motion.span
          className="flex items-center justify-center gap-2"
          initial={false}
          animate={
            status === "loading"
              ? { opacity: 0.85 }
              : status === "success"
                ? { scale: [1, 1.04, 1] }
                : { opacity: 1 }
          }
          transition={{ duration: 0.5 }}
        >
          {status === "loading" && (
            <motion.span
              className="h-4 w-4 rounded-full border-2 border-charcoal/30 border-t-charcoal"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.75, ease: "linear" }}
              aria-hidden
            />
          )}
          {status === "success" ? (
            <motion.span
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-charcoal"
            >
              Sent — we will be in touch
            </motion.span>
          ) : status === "loading" ? (
            "Sending…"
          ) : (
            "Send message"
          )}
        </motion.span>
      </motion.button>
    </motion.form>
  );
}
