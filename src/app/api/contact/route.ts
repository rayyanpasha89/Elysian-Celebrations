import { NextRequest } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, destination, weddingDate, guestCount: guestRaw, message } = body;

    if (!name || !email || !message) {
      return apiError("Name, email, and message are required");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return apiError("Invalid email address");
    }

    let guestCount: number | null = null;
    if (guestRaw !== undefined && guestRaw !== null && guestRaw !== "") {
      const n =
        typeof guestRaw === "number" ? guestRaw : parseInt(String(guestRaw), 10);
      if (!Number.isFinite(n) || n < 1) {
        return apiError("Invalid guest count");
      }
      guestCount = n;
    }

    const supabase = createAdminSupabaseClient();

    const { data: inquiry, error } = await supabase
      .from("contact_inquiries")
      .insert({
        name,
        email: email.toLowerCase(),
        phone: phone || null,
        destination: destination || null,
        wedding_date: weddingDate || null,
        guest_count: guestCount,
        message,
      })
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
