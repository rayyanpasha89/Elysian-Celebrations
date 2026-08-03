import { NextRequest } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api-utils";
import type { Database } from "@/types/database.types";

type ContactInquiryInsert =
  Database["public"]["Tables"]["contact_inquiries"]["Insert"];

export async function POST(request: NextRequest) {
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return apiError("Invalid email address");
    }

    let guestCount: ContactInquiryInsert["guest_count"] = null;
    if (guestRaw !== undefined && guestRaw !== null && guestRaw !== "") {
      const n =
        typeof guestRaw === "number" ? guestRaw : parseInt(String(guestRaw), 10);
      if (!Number.isFinite(n) || n < 1) {
        return apiError("Invalid guest count");
      }
      guestCount = String(n);
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
