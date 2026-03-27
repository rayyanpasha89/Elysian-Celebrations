"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const inputClass =
  "peer w-full border-0 border-b border-charcoal/25 bg-transparent px-0 pb-2.5 pt-7 text-charcoal outline-none transition-colors duration-300 focus:border-gold-primary";

const labelClass =
  "pointer-events-none absolute left-0 top-1/2 origin-left -translate-y-1/2 text-slate transition-all duration-200 peer-focus:top-0 peer-focus:-translate-y-0 peer-focus:text-[10px] peer-focus:text-gold-dark peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-0 peer-[:not(:placeholder-shown)]:text-[10px]";

type FloatingFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export const FloatingField = forwardRef<HTMLInputElement, FloatingFieldProps>(
  ({ label, error, className, id, ...props }, ref) => {
    return (
      <div className="relative">
        <input
          ref={ref}
          id={id}
          placeholder=" "
          className={cn(inputClass, className)}
          {...props}
        />
        <label htmlFor={id} className={cn(labelClass, "font-heading text-sm")}>
          {label}
        </label>
        {error && (
          <p className="font-heading mt-1 text-xs text-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

FloatingField.displayName = "FloatingField";

const textareaClass =
  "peer min-h-[140px] w-full resize-y border-0 border-b border-charcoal/25 bg-transparent px-0 pb-2.5 pt-8 text-charcoal outline-none transition-colors duration-300 focus:border-gold-primary";

const textareaLabelClass =
  "pointer-events-none absolute left-0 top-6 origin-left text-slate transition-all duration-200 peer-focus:top-0 peer-focus:text-[10px] peer-focus:text-gold-dark peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-[10px]";

type FloatingTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
};

export const FloatingTextarea = forwardRef<HTMLTextAreaElement, FloatingTextareaProps>(
  ({ label, error, className, id, ...props }, ref) => {
    return (
      <div className="relative">
        <textarea
          ref={ref}
          id={id}
          placeholder=" "
          className={cn(textareaClass, className)}
          {...props}
        />
        <label htmlFor={id} className={cn(textareaLabelClass, "font-heading text-sm")}>
          {label}
        </label>
        {error && (
          <p className="font-heading mt-1 text-xs text-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

FloatingTextarea.displayName = "FloatingTextarea";
