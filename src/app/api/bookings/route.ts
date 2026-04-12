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
        `*, client:client_profiles(id, user_id, partner_name, weddings(destination:destinations(name))), vendor:vendor_profiles(business_name, slug, user_id), service:vendor_services(id, name, description, base_price, max_price, unit), event:wedding_events(name, wedding_day:wedding_days(name))`
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

    if (vendorServiceId && typeof vendorServiceId !== "string") {
      return apiError("Vendor service ID is invalid", 400);
    }

    if (weddingEventId && typeof weddingEventId !== "string") {
      return apiError("Wedding event ID is invalid", 400);
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

    const { data: vendorProfile, error: vendorProfileError } = await supabase
      .from("vendor_profiles")
      .select("id")
      .eq("id", vendorProfileId)
      .maybeSingle();

    if (vendorProfileError) {
      console.error("Vendor profile lookup error:", vendorProfileError);
      return apiError("Failed to validate vendor", 500);
    }

    if (!vendorProfile) {
      return apiError("Vendor not found", 404);
    }

    if (vendorServiceId) {
      const { data: service, error: serviceError } = await supabase
        .from("vendor_services")
        .select("id, vendor_profile_id")
        .eq("id", vendorServiceId)
        .maybeSingle();

      if (serviceError) {
        console.error("Vendor service lookup error:", serviceError);
        return apiError("Failed to validate vendor service", 500);
      }

      if (!service || service.vendor_profile_id !== vendorProfileId) {
        return apiError("Selected service does not belong to this vendor", 400);
      }
    }

    if (weddingEventId) {
      const { data: wedding, error: weddingError } = await supabase
        .from("weddings")
        .select("id")
        .eq("client_profile_id", clientProfile.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (weddingError) {
        console.error("Wedding lookup error:", weddingError);
        return apiError("Failed to validate booking event", 500);
      }

      if (!wedding) {
        return apiError("Wedding not found", 404);
      }

      const { data: linkedEvent, error: linkedEventError } = await supabase
        .from("wedding_events")
        .select("id")
        .eq("id", weddingEventId)
        .eq("wedding_id", wedding.id)
        .maybeSingle();

      if (linkedEventError) {
        console.error("Wedding event lookup error:", linkedEventError);
        return apiError("Failed to validate booking event", 500);
      }

      if (!linkedEvent) {
        return apiError("Event not found for this wedding", 404);
      }
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
