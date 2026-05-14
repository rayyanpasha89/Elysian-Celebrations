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

function initialsFor(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function statusLabel(raw: string | null | undefined) {
  if (!raw) return "Inquiry";
  return raw
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

type SingleOrArray<T> = T | T[] | null | undefined;

function pickOne<T>(value: SingleOrArray<T>): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

type BookingRow = {
  id: string;
  status: string | null;
  event_date: string | null;
  created_at: string;
  notes: string | null;
  client: SingleOrArray<{ user_id: string | null; partner_name: string | null }>;
  vendor: SingleOrArray<{
    user_id: string | null;
    business_name: string | null;
    slug: string | null;
  }>;
  service: SingleOrArray<{
    id: string;
    name: string | null;
    service_scope: string | null;
  }>;
  wedding_event: SingleOrArray<{
    id: string;
    name: string | null;
    event_type: string | null;
    date: string | null;
    start_time: string | null;
    venue: string | null;
    wedding_day: SingleOrArray<{
      id: string;
      name: string | null;
      date: string | null;
    }>;
  }>;
};

type MessageRow = {
  id: string;
  booking_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
};

type ThreadReadRow = {
  booking_id: string;
  read_at: string;
};

type ConversationMessage = {
  id: string;
  from: "vendor" | "client";
  text: string;
  time: string;
  createdAt: string;
};

type BookingContext = {
  status: string;
  statusLabel: string;
  eventDate: string | null;
  notes: string | null;
  service: { name: string; scope: string | null } | null;
  weddingEvent: {
    name: string;
    eventType: string | null;
    date: string | null;
    startTime: string | null;
    venue: string | null;
  } | null;
  weddingDay: { name: string; date: string | null } | null;
};

type Conversation = {
  id: string;
  vendor: string;
  initials: string;
  preview: string;
  time: string;
  createdAt: string | null;
  counterpartyName: string;
  counterpartyRole: "vendor" | "client";
  hasMessages: boolean;
  unread: boolean;
  unreadCount: number;
  lastReadAt: string | null;
  booking: BookingContext;
  messages: { id: string; from: "vendor" | "client"; text: string; time: string }[];
};

const BOOKING_SELECT =
  "id, status, event_date, created_at, notes, client:client_profiles(user_id, partner_name), vendor:vendor_profiles(user_id, business_name, slug), service:vendor_services(id, name, service_scope), wedding_event:wedding_events(id, name, event_type, date, start_time, venue, wedding_day:wedding_days(id, name, date))";

function deriveBookingContext(booking: BookingRow): BookingContext {
  const service = pickOne(booking.service);
  const weddingEvent = pickOne(booking.wedding_event);
  const weddingDay = weddingEvent ? pickOne(weddingEvent.wedding_day) : null;
  return {
    status: booking.status ?? "INQUIRY",
    statusLabel: statusLabel(booking.status),
    eventDate: booking.event_date,
    notes: booking.notes,
    service: service
      ? {
          name: service.name ?? "Service",
          scope: service.service_scope ?? null,
        }
      : null,
    weddingEvent: weddingEvent
      ? {
          name: weddingEvent.name ?? "Event",
          eventType: weddingEvent.event_type,
          date: weddingEvent.date,
          startTime: weddingEvent.start_time,
          venue: weddingEvent.venue,
        }
      : null,
    weddingDay: weddingDay
      ? {
          name: weddingDay.name ?? "Day",
          date: weddingDay.date,
        }
      : null,
  };
}

function buildConversation(
  booking: BookingRow,
  counterpartyRole: "vendor" | "client",
  myUserId: string,
  messages: MessageRow[],
  threadReadAt: string | null
): Conversation {
  const vendor = pickOne(booking.vendor);
  const client = pickOne(booking.client);
  const counterpartyName =
    counterpartyRole === "vendor"
      ? vendor?.business_name?.trim() || "Vendor"
      : client?.partner_name?.trim() || "Client";

  const projected: ConversationMessage[] = messages.map((m) => ({
    id: m.id,
    from:
      m.sender_id === myUserId
        ? counterpartyRole === "vendor"
          ? "client"
          : "vendor"
        : counterpartyRole,
    text: m.content,
    time: formatMessageTimestamp(m.created_at),
    createdAt: m.created_at,
  }));

  const last = projected[projected.length - 1] ?? null;
  const context = deriveBookingContext(booking);
  const fallbackPreview =
    booking.notes?.trim() ||
    context.service?.name ||
    context.weddingEvent?.name ||
    "Inquiry waiting on a first message";

  const readBoundary = threadReadAt ? new Date(threadReadAt).getTime() : 0;
  const unreadMessages = messages.filter((message) => {
    if (message.sender_id === myUserId) return false;
    if (message.is_read) return false;
    return new Date(message.created_at).getTime() > readBoundary;
  });
  const inquiryCreatedAt = new Date(booking.created_at).getTime();
  const freshInquiryUnread =
    messages.length === 0 &&
    context.status === "INQUIRY" &&
    counterpartyRole === "client" &&
    inquiryCreatedAt > readBoundary;
  const unreadCount = unreadMessages.length + (freshInquiryUnread ? 1 : 0);

  return {
    id: booking.id,
    vendor: counterpartyName,
    initials: initialsFor(counterpartyName),
    preview: last?.text ?? fallbackPreview,
    time: last ? relTime(last.createdAt) : statusLabel(context.status),
    createdAt: last?.createdAt ?? null,
    counterpartyName,
    counterpartyRole,
    hasMessages: projected.length > 0,
    unread: unreadCount > 0,
    unreadCount,
    lastReadAt: threadReadAt,
    booking: context,
    messages: projected.map((m) => ({
      id: m.id,
      from: m.from,
      text: m.text,
      time: m.time,
    })),
  };
}

function mapThreadReads(reads: ThreadReadRow[] | null) {
  const byBooking = new Map<string, string>();
  for (const read of reads ?? []) {
    byBooking.set(read.booking_id, read.read_at);
  }
  return byBooking;
}

async function loadThreadReads(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
  bookingIds: string[]
) {
  if (bookingIds.length === 0) return new Map<string, string>();
  const { data, error } = await supabase
    .from("message_thread_reads")
    .select("booking_id, read_at")
    .eq("user_id", userId)
    .in("booking_id", bookingIds);

  if (error) {
    console.error("message_thread_reads:", error);
    throw new Error("Failed to load read state");
  }

  return mapThreadReads((data ?? []) as ThreadReadRow[]);
}

function sortConversations(list: Conversation[]) {
  return list.sort((a, b) => {
    if (a.hasMessages !== b.hasMessages) {
      return a.hasMessages ? -1 : 1;
    }
    if (a.createdAt && b.createdAt) {
      return b.createdAt.localeCompare(a.createdAt);
    }
    if (a.createdAt) return -1;
    if (b.createdAt) return 1;
    return a.vendor.localeCompare(b.vendor);
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
        return apiSuccess({ conversations: [], needsOnboarding: true });
      }

      const { data: bookings, error: bErr } = await supabase
        .from("bookings")
        .select(BOOKING_SELECT)
        .eq("client_profile_id", profile.id)
        .order("created_at", { ascending: false });
      if (bErr) {
        console.error("bookings:", bErr);
        return apiError("Failed to load bookings", 500);
      }

      const bookingRows = (bookings ?? []) as BookingRow[];
      const bookingIds = bookingRows.map((b) => b.id);
      const messagesByBooking = new Map<string, MessageRow[]>();
      const threadReadsByBooking = await loadThreadReads(
        supabase,
        session.userId,
        bookingIds
      );
      if (bookingIds.length > 0) {
        const { data: msgs, error: mErr } = await supabase
          .from("messages")
          .select("id, booking_id, sender_id, content, is_read, created_at")
          .in("booking_id", bookingIds)
          .order("created_at", { ascending: true });
        if (mErr) {
          console.error("messages:", mErr);
          return apiError("Failed to load messages", 500);
        }
        for (const m of (msgs ?? []) as MessageRow[]) {
          const bucket = messagesByBooking.get(m.booking_id);
          if (bucket) bucket.push(m);
          else messagesByBooking.set(m.booking_id, [m]);
        }
      }

      const conversations = sortConversations(
        bookingRows.map((booking) =>
          buildConversation(
            booking,
            "vendor",
            session.userId,
            messagesByBooking.get(booking.id) ?? [],
            threadReadsByBooking.get(booking.id) ?? null
          )
        )
      );

      return apiSuccess({ conversations, needsOnboarding: false });
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
        return apiSuccess({ conversations: [], needsProfile: true });
      }

      const { data: bookings, error: bErr } = await supabase
        .from("bookings")
        .select(BOOKING_SELECT)
        .eq("vendor_profile_id", vp.id)
        .order("created_at", { ascending: false });
      if (bErr) {
        console.error("bookings:", bErr);
        return apiError("Failed to load bookings", 500);
      }

      const bookingRows = (bookings ?? []) as BookingRow[];
      const bookingIds = bookingRows.map((b) => b.id);
      const messagesByBooking = new Map<string, MessageRow[]>();
      const threadReadsByBooking = await loadThreadReads(
        supabase,
        session.userId,
        bookingIds
      );
      if (bookingIds.length > 0) {
        const { data: msgs, error: mErr } = await supabase
          .from("messages")
          .select("id, booking_id, sender_id, content, is_read, created_at")
          .in("booking_id", bookingIds)
          .order("created_at", { ascending: true });
        if (mErr) {
          console.error("messages:", mErr);
          return apiError("Failed to load messages", 500);
        }
        for (const m of (msgs ?? []) as MessageRow[]) {
          const bucket = messagesByBooking.get(m.booking_id);
          if (bucket) bucket.push(m);
          else messagesByBooking.set(m.booking_id, [m]);
        }
      }

      const conversations = sortConversations(
        bookingRows.map((booking) =>
          buildConversation(
            booking,
            "client",
            session.userId,
            messagesByBooking.get(booking.id) ?? [],
            threadReadsByBooking.get(booking.id) ?? null
          )
        )
      );

      return apiSuccess({ conversations, needsProfile: false });
    }

    return apiSuccess({ conversations: [] });
  } catch (e) {
    console.error("GET /api/messages", e);
    return apiError("Internal server error", 500);
  }
}

export async function PATCH(request: Request) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "client", "vendor");
  if (roleCheck) return roleCheck;

  try {
    const body = (await request.json()) as {
      bookingId?: unknown;
    };
    const bookingId =
      typeof body.bookingId === "string" ? body.bookingId.trim() : "";

    if (!bookingId) {
      return apiError("Booking ID is required");
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

    const canRead =
      clientRelation?.user_id === session.userId ||
      vendorRelation?.user_id === session.userId;

    if (!canRead) {
      return apiError("Forbidden", 403);
    }

    const readAt = new Date().toISOString();
    const { data: threadRead, error: readErr } = await supabase
      .from("message_thread_reads")
      .upsert(
        {
          booking_id: bookingId,
          user_id: session.userId,
          read_at: readAt,
        },
        { onConflict: "booking_id,user_id" }
      )
      .select("read_at")
      .single();

    if (readErr) {
      console.error("message_thread_reads upsert:", readErr);
      return apiError("Failed to mark thread read", 500);
    }

    const { error: messageErr } = await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("booking_id", bookingId)
      .neq("sender_id", session.userId)
      .eq("is_read", false);

    if (messageErr) {
      console.error("messages mark read:", messageErr);
      return apiError("Failed to mark messages read", 500);
    }

    return apiSuccess({
      bookingId,
      readAt: threadRead?.read_at ?? readAt,
    });
  } catch (e) {
    console.error("PATCH /api/messages", e);
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
    if (content.length > 4000) {
      return apiError("Message is too long (max 4000 characters)");
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
