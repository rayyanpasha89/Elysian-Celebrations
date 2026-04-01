import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  getAuthSession,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";

function relTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

function formatMessageTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function GET() {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "client", "vendor", "admin");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();

    if (session.role === "client") {
      const { data: profile, error: pErr } = await supabase
        .from("client_profiles")
        .select("id")
        .eq("user_id", session.userId)
        .maybeSingle();
      if (pErr) {
        console.error("client_profiles:", pErr);
        return apiError("Failed to load profile", 500);
      }
      if (!profile) {
        return apiSuccess({ conversations: [] });
      }

      const { data: bookings, error: bErr } = await supabase
        .from("bookings")
        .select("id, vendor:vendor_profiles(business_name)")
        .eq("client_profile_id", profile.id);
      if (bErr) {
        console.error("bookings:", bErr);
        return apiError("Failed to load bookings", 500);
      }

      const bookingIds = (bookings ?? []).map((b) => b.id);
      if (bookingIds.length === 0) {
        return apiSuccess({ conversations: [] });
      }

      const { data: msgs, error: mErr } = await supabase
        .from("messages")
        .select("id, booking_id, sender_id, content, created_at")
        .in("booking_id", bookingIds)
        .order("created_at", { ascending: true });

      if (mErr) {
        console.error("messages:", mErr);
        return apiError("Failed to load messages", 500);
      }

      const byBooking = new Map<
        string,
        {
          bookingId: string;
          vendorName: string;
          messages: {
            id: string;
            from: "vendor" | "client";
            text: string;
            time: string;
            createdAt: string;
          }[];
        }
      >();

      for (const b of bookings ?? []) {
        const v = b.vendor as { business_name?: string } | null;
        byBooking.set(b.id, {
          bookingId: b.id,
          vendorName: v?.business_name ?? "Vendor",
          messages: [],
        });
      }

      for (const m of msgs ?? []) {
        const conv = byBooking.get(m.booking_id);
        if (!conv) continue;
        conv.messages.push({
          id: m.id,
          from: m.sender_id === session.userId ? "client" : "vendor",
          text: m.content,
          time: new Date(m.created_at).toLocaleString("en-IN", {
            weekday: "short",
            hour: "2-digit",
            minute: "2-digit",
          }),
          createdAt: m.created_at,
        });
      }

      const conversations = [...byBooking.values()]
        .filter((c) => c.messages.length > 0)
        .map((c) => {
          const last = c.messages[c.messages.length - 1]!;
          const initials = c.vendorName
            .split(/\s+/)
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
          return {
            id: c.bookingId,
            vendor: c.vendorName,
            initials,
            preview: last.text,
            time: relTime(last.createdAt),
            messages: c.messages.map((message) => ({
              id: message.id,
              from: message.from,
              text: message.text,
              time: message.time,
            })),
          };
        });

      return apiSuccess({ conversations });
    }

    if (session.role === "vendor") {
      const { data: vp, error: vErr } = await supabase
        .from("vendor_profiles")
        .select("id")
        .eq("user_id", session.userId)
        .maybeSingle();
      if (vErr) {
        console.error("vendor_profiles:", vErr);
        return apiError("Failed to load vendor", 500);
      }
      if (!vp) {
        return apiSuccess({ conversations: [] });
      }

      const { data: bookings, error: bErr } = await supabase
        .from("bookings")
        .select("id, client:client_profiles(partner_name)")
        .eq("vendor_profile_id", vp.id);
      if (bErr) {
        console.error("bookings:", bErr);
        return apiError("Failed to load bookings", 500);
      }

      const bookingIds = (bookings ?? []).map((b) => b.id);
      if (bookingIds.length === 0) {
        return apiSuccess({ conversations: [] });
      }

      const { data: msgs, error: mErr } = await supabase
        .from("messages")
        .select("id, booking_id, sender_id, content, created_at")
        .in("booking_id", bookingIds)
        .order("created_at", { ascending: true });

      if (mErr) {
        console.error("messages:", mErr);
        return apiError("Failed to load messages", 500);
      }

      const byBooking = new Map<
        string,
        {
          bookingId: string;
          label: string;
          messages: {
            id: string;
            from: "vendor" | "client";
            text: string;
            time: string;
            createdAt: string;
          }[];
        }
      >();

      for (const b of bookings ?? []) {
        const cl = b.client as { partner_name?: string } | null;
        byBooking.set(b.id, {
          bookingId: b.id,
          label: cl?.partner_name ?? "Client",
          messages: [],
        });
      }

      for (const m of msgs ?? []) {
        const conv = byBooking.get(m.booking_id);
        if (!conv) continue;
        conv.messages.push({
          id: m.id,
          from: m.sender_id === session.userId ? "vendor" : "client",
          text: m.content,
          time: new Date(m.created_at).toLocaleString("en-IN", {
            weekday: "short",
            hour: "2-digit",
            minute: "2-digit",
          }),
          createdAt: m.created_at,
        });
      }

      const conversations = [...byBooking.values()]
        .filter((c) => c.messages.length > 0)
        .map((c) => {
          const last = c.messages[c.messages.length - 1]!;
          const initials = c.label
            .split(/\s+/)
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
          return {
            id: c.bookingId,
            vendor: c.label,
            initials,
            preview: last.text,
            time: relTime(last.createdAt),
            messages: c.messages.map((message) => ({
              id: message.id,
              from: message.from,
              text: message.text,
              time: message.time,
            })),
          };
        });

      return apiSuccess({ conversations });
    }

    return apiSuccess({ conversations: [] });
  } catch (e) {
    console.error("GET /api/messages", e);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "client", "vendor");
  if (roleCheck) return roleCheck;

  try {
    const body = (await request.json()) as {
      bookingId?: unknown;
      content?: unknown;
    };
    const bookingId =
      typeof body.bookingId === "string" ? body.bookingId.trim() : "";
    const content =
      typeof body.content === "string" ? body.content.trim() : "";

    if (!bookingId) {
      return apiError("Booking ID is required");
    }
    if (!content) {
      return apiError("Message cannot be empty");
    }

    const supabase = createAdminSupabaseClient();
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, client:client_profiles(user_id), vendor:vendor_profiles(user_id)")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingErr) {
      console.error("bookings:", bookingErr);
      return apiError("Failed to load booking", 500);
    }
    if (!booking) {
      return apiError("Booking not found", 404);
    }

    const clientRelation = Array.isArray(booking.client)
      ? booking.client[0]
      : booking.client;
    const vendorRelation = Array.isArray(booking.vendor)
      ? booking.vendor[0]
      : booking.vendor;

    const canPost =
      clientRelation?.user_id === session.userId ||
      vendorRelation?.user_id === session.userId;

    if (!canPost) {
      return apiError("Forbidden", 403);
    }

    const { data: message, error } = await supabase
      .from("messages")
      .insert({
        booking_id: bookingId,
        sender_id: session.userId,
        content,
      })
      .select("id, content, created_at")
      .single();

    if (error || !message) {
      console.error("messages insert:", error);
      return apiError("Failed to send message", 500);
    }

    return apiSuccess(
      {
        message: {
          id: message.id,
          from: session.role === "vendor" ? "vendor" : "client",
          text: message.content,
          time: formatMessageTimestamp(message.created_at),
          createdAt: message.created_at,
        },
      },
      201
    );
  } catch (e) {
    console.error("POST /api/messages", e);
    return apiError("Internal server error", 500);
  }
}
