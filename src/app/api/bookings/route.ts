import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  getAuthSession,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;

  const roleCheck = requireRole(session, "client", "vendor", "admin", "manager");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();
    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status");

    let query = supabase
      .from("bookings")
      .select(
        `*, client:client_profiles(id, user_id, partner_name, weddings(destination:destinations(name))), vendor:vendor_profiles(business_name, slug, user_id), service:vendor_services(name, base_price)`
      )
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    if (session.role === "client") {
      const { data: profile, error: pErr } = await supabase
        .from("client_profiles")
        .select("id")
        .eq("user_id", session.userId)
        .maybeSingle();
      if (pErr) {
        console.error("Client profile lookup error:", pErr);
        return apiError("Failed to load profile", 500);
      }
      if (!profile) {
        return apiSuccess({ bookings: [] });
      }
      query = query.eq("client_profile_id", profile.id);
    } else if (session.role === "vendor") {
      const { data: profile, error: pErr } = await supabase
        .from("vendor_profiles")
        .select("id")
        .eq("user_id", session.userId)
        .maybeSingle();
      if (pErr) {
        console.error("Vendor profile lookup error:", pErr);
        return apiError("Failed to load profile", 500);
      }
      if (!profile) {
        return apiSuccess({ bookings: [] });
      }
      query = query.eq("vendor_profile_id", profile.id);
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error("Bookings list error:", error);
      return apiError("Failed to fetch bookings", 500);
    }

    return apiSuccess({ bookings: bookings ?? [] });
  } catch (error) {
    console.error("Bookings list error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;

  const roleCheck = requireRole(session, "client");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();
    const body = await request.json();
    const { vendorProfileId, vendorServiceId, weddingEventId, eventDate, notes } =
      body;

    if (!vendorProfileId || typeof vendorProfileId !== "string") {
      return apiError("Vendor profile ID is required");
    }

    const { data: clientProfile, error: cpErr } = await supabase
      .from("client_profiles")
      .select("id")
      .eq("user_id", session.userId)
      .maybeSingle();

    if (cpErr) {
      console.error("Client profile error:", cpErr);
      return apiError("Failed to load client profile", 500);
    }
    if (!clientProfile) {
      return apiError("Client profile not found", 404);
    }

    const { data: booking, error } = await supabase
      .from("bookings")
      .insert({
        client_profile_id: clientProfile.id,
        vendor_profile_id: vendorProfileId,
        vendor_service_id: vendorServiceId || null,
        wedding_event_id: weddingEventId || null,
        event_date: eventDate || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Booking create error:", error);
      return apiError("Failed to create booking", 500);
    }

    return apiSuccess(booking, 201);
  } catch (error) {
    console.error("Booking create error:", error);
    return apiError("Internal server error", 500);
  }
}
