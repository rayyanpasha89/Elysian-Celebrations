import { NextRequest } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api-utils";
import { enforceRateLimit } from "@/lib/rate-limit";
import type { Database } from "@/types/database.types";

type ContactInquiryInsert =
  Database["public"]["Tables"]["contact_inquiries"]["Insert"];

const CONTACT_LIMITS = {
  name: 120,
  email: 254,
  phone: 40,
  destination: 120,
  message: 4_000,
} as const;

function isIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return date.toISOString().slice(0, 10) === value;
}

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, {
    scope: "contact-inquiry",
    limit: 5,
    windowSeconds: 15 * 60,
  });
  if (limited) return limited;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const destination =
      typeof body.destination === "string" ? body.destination.trim() : "";
    const weddingDate =
      typeof body.weddingDate === "string" ? body.weddingDate.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const guestRaw = body.guestCount;

    if (!name || !email || !message) {
      return apiError("Name, email, and message are required");
    }

    const lengthChecks: Array<[string, string, number]> = [
      ["Name", name, CONTACT_LIMITS.name],
      ["Email", email, CONTACT_LIMITS.email],
      ["Phone", phone, CONTACT_LIMITS.phone],
      ["Destination", destination, CONTACT_LIMITS.destination],
      ["Message", message, CONTACT_LIMITS.message],
    ];
    for (const [label, value, max] of lengthChecks) {
      if (value.length > max) {
        return apiError(`${label} is too long (max ${max} characters)`, 400);
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return apiError("Invalid email address");
    }
    if (weddingDate && !isIsoDate(weddingDate)) {
      return apiError("Invalid event date");
    }

    let guestCount: ContactInquiryInsert["guest_count"] = null;
    if (guestRaw !== undefined && guestRaw !== null && guestRaw !== "") {
      const normalizedGuestCount = String(guestRaw).trim();
      if (!/^\d+$/.test(normalizedGuestCount)) {
        return apiError("Invalid guest count");
      }
      const n = Number(normalizedGuestCount);
      if (!Number.isSafeInteger(n) || n < 1) {
        return apiError("Invalid guest count");
      }
      if (n > 100_000) return apiError("Guest count is too large");
      guestCount = String(Math.floor(n));
    }

    const supabase = createAdminSupabaseClient();

    const inquiryInsert: ContactInquiryInsert = {
      name,
      email: email.toLowerCase(),
      phone: phone || null,
      destination: destination || null,
      wedding_date: weddingDate || null,
      guest_count: guestCount,
      message,
    };

    const { data: inquiry, error } = await supabase
      .from("contact_inquiries")
      .insert(inquiryInsert)
      .select("id, name, email, created_at")
      .single();

    if (error) {
      console.error("Contact inquiry error:", error);
      return apiError("Failed to submit inquiry", 500);
    }

    return apiSuccess(
      { ...inquiry, message: "Inquiry submitted successfully" },
      201
    );
  } catch (error) {
    console.error("Contact inquiry error:", error);
    return apiError("Internal server error", 500);
  }
}
