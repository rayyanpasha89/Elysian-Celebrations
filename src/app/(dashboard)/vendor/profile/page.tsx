"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
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

const MAX_PORTFOLIO_IMAGES = 12;

type ProfileMedia = {
  coverImage: string | null;
  portfolio: string[];
};

export default function VendorProfilePage() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryOpt[]>([]);
  const [hasProfile, setHasProfile] = useState(false);
  const [media, setMedia] = useState<ProfileMedia>({
    coverImage: null,
    portfolio: [],
  });
  const [uploading, setUploading] = useState<"cover" | "portfolio" | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const portfolioInputRef = useRef<HTMLInputElement>(null);

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
            setMedia({
              coverImage: p.coverImage ?? null,
              portfolio: Array.isArray(p.portfolio) ? p.portfolio : [],
            });
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

  async function persistMedia(nextMedia: ProfileMedia) {
    const res = await fetch("/api/vendor/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextMedia),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Could not save media");

    setMedia({
      coverImage: json.coverImage ?? null,
      portfolio: Array.isArray(json.portfolio) ? json.portfolio : [],
    });
  }

  async function uploadFiles(
    event: ChangeEvent<HTMLInputElement>,
    placement: "cover" | "portfolio"
  ) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!selectedFiles.length) return;
    if (!hasProfile) {
      toast.info("Save the business details first, then add imagery.");
      return;
    }

    const remaining = MAX_PORTFOLIO_IMAGES - media.portfolio.length;
    const files = placement === "cover" ? selectedFiles.slice(0, 1) : selectedFiles.slice(0, remaining);
    if (!files.length) {
      toast.info(`Your portfolio can contain up to ${MAX_PORTFOLIO_IMAGES} images.`);
      return;
    }

    setUploading(placement);
    try {
      const uploadedUrls = await Promise.all(
        files.map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch("/api/vendor/profile/images", {
            method: "POST",
            body: formData,
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? `Could not upload ${file.name}`);
          return json.url as string;
        })
      );

      const nextMedia: ProfileMedia =
        placement === "cover"
          ? { ...media, coverImage: uploadedUrls[0] ?? media.coverImage }
          : {
              ...media,
              portfolio: Array.from(new Set([...media.portfolio, ...uploadedUrls])),
            };
      await persistMedia(nextMedia);
      toast.success(placement === "cover" ? "Cover image updated" : "Portfolio updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload image");
    } finally {
      setUploading(null);
    }
  }

  async function removeMedia(placement: "cover" | "portfolio", imageUrl?: string) {
    const nextMedia: ProfileMedia =
      placement === "cover"
        ? { ...media, coverImage: null }
        : { ...media, portfolio: media.portfolio.filter((url) => url !== imageUrl) };

    try {
      await persistMedia(nextMedia);
      toast.success(placement === "cover" ? "Cover image removed" : "Portfolio image removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update media");
    }
  }

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
            <div className="group relative aspect-[16/10] overflow-hidden border border-charcoal/10 bg-gradient-to-br from-midnight/80 via-charcoal/80 to-olive/70">
              {media.coverImage ? (
                <Image
                  src={media.coverImage}
                  alt="Business cover"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="flex h-full items-end bg-[radial-gradient(circle_at_82%_12%,rgba(194,197,170,0.34),transparent_32%)] p-5">
                  <p className="max-w-48 font-display text-xl text-cream">Set the scene for your studio.</p>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-charcoal/85 to-transparent px-4 pb-4 pt-10">
                <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-cream">Cover image</p>
                <div className="flex items-center gap-2">
                  {media.coverImage ? (
                    <button
                      type="button"
                      onClick={() => void removeMedia("cover")}
                      className="font-accent text-[9px] uppercase tracking-[0.16em] text-cream/80 transition hover:text-cream"
                    >
                      Remove
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={!hasProfile || uploading !== null}
                    className="border border-cream/40 bg-charcoal/30 px-3 py-2 font-accent text-[9px] uppercase tracking-[0.16em] text-cream backdrop-blur transition hover:border-gold-light hover:bg-charcoal/55 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uploading === "cover" ? "Uploading" : media.coverImage ? "Replace" : "Upload"}
                  </button>
                </div>
              </div>
            </div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => void uploadFiles(event, "cover")}
            />
            <p className={cn(dashLabel, "mt-4")}>Studio cover</p>
            <p className="mt-2 font-heading text-xs leading-relaxed text-slate">
              JPEG, PNG, or WebP up to 8 MB. Save your profile once before uploading.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {media.portfolio.map((url, index) => (
              <div
                key={url}
                className="group relative aspect-square overflow-hidden border border-charcoal/10 bg-cream"
              >
                <Image
                  src={url}
                  alt={`Portfolio image ${index + 1}`}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                <button
                  type="button"
                  onClick={() => void removeMedia("portfolio", url)}
                  className="absolute right-2 top-2 border border-cream/45 bg-charcoal/70 px-2 py-1 font-accent text-[8px] uppercase tracking-[0.14em] text-cream opacity-0 transition group-hover:opacity-100 focus:opacity-100"
                  aria-label={`Remove portfolio image ${index + 1}`}
                >
                  Remove
                </button>
              </div>
            ))}
            {media.portfolio.length < MAX_PORTFOLIO_IMAGES ? (
              <button
                type="button"
                onClick={() => portfolioInputRef.current?.click()}
                disabled={!hasProfile || uploading !== null}
                className="flex aspect-square items-center justify-center border border-dashed border-charcoal/25 bg-transparent px-4 text-center font-accent text-[10px] uppercase tracking-[0.16em] text-slate transition-colors hover:border-gold-primary hover:text-gold-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploading === "portfolio" ? "Uploading" : "Add to portfolio"}
              </button>
            ) : null}
          </div>
          <input
            ref={portfolioInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => void uploadFiles(event, "portfolio")}
          />
          <p className="font-accent text-[10px] uppercase tracking-[0.16em] text-slate">
            {media.portfolio.length} of {MAX_PORTFOLIO_IMAGES} portfolio images
          </p>
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
