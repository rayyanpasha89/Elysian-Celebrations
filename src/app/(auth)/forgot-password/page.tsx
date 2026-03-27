"use client";

import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { FloatingField } from "@/components/auth/floating-field";
import { authPrimaryButtonClass } from "@/components/auth/auth-styles";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const [success, setSuccess] = useState(false);

  const onSubmit = async () => {
    try {
      await new Promise((r) => setTimeout(r, 600));
      toast.success("Check your email for a reset link.");
      setSuccess(true);
      reset();
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-charcoal md:text-4xl">
        Reset password
      </h1>
      <p className="font-heading mt-3 text-sm font-light text-slate">
        We&apos;ll email you a link to choose a new password.
      </p>

      {success ? (
        <motion.div
          className="mt-12 border border-gold-primary/30 bg-cream/50 p-8 text-center"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <motion.div
            className="mx-auto flex h-12 w-12 items-center justify-center border border-gold-primary text-gold-primary"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 7h16v10H4V7z" />
              <path d="M4 7l8-4 8 4" />
            </svg>
          </motion.div>
          <p className="font-heading mt-6 text-sm leading-relaxed text-charcoal">
            Check your email for a reset link.
          </p>
          <Link
            href="/login"
            className="font-accent mt-8 inline-block text-[11px] uppercase tracking-[0.2em] text-gold-primary underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-12 space-y-10" noValidate>
          <FloatingField
            id="forgot-email"
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />
          <button type="submit" className={authPrimaryButtonClass} disabled={isSubmitting}>
            Send Reset Link
          </button>
        </form>
      )}
    </div>
  );
}
