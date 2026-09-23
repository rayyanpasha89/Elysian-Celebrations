import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  getAuthSession,
  requireRole,
  apiError,
  apiSuccess,
  type AuthSession,
} from "@/lib/api-utils";
import { enforceRateLimit } from "@/lib/rate-limit";
import { loadOperationsStaffScope } from "@/lib/operations-auth";
import { isUuid } from "@/lib/id-utils";

function canReadOperationsMessages(permissions: readonly string[]) {
  return permissions.some((permission) =>
    ["MESSAGE_CLIENT", "MESSAGE_VENDORS"].includes(permission)
  );
}

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
    wedding_id: string;
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
  created_at: string;
};

type InboxSnapshot = {
  messages: MessageRow[];
  messageCount: number;
  unreadCount: number;
  lastReadAt: string | null;
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
  clientName: string;
  vendorName: string;
  counterpartyName: string;
  counterpartyRole: "vendor" | "client";
  hasMessages: boolean;
  unread: boolean;
  unreadCount: number;
  lastReadAt: string | null;
  booking: BookingContext;
  messagePage: {
    hasOlder: boolean;
    oldestCreatedAt: string | null;
    oldestId: string | null;
    totalCount: number;
  };
  messages: ConversationMessage[];
};

const MESSAGE_PAGE_SIZE = 40;
const MESSAGE_PAGE_QUERY_SIZE = MESSAGE_PAGE_SIZE + 1;
const BOOKING_SELECT =
  "id, status, event_date, created_at, notes, client:client_profiles(user_id, partner_name), vendor:vendor_profiles(user_id, business_name, slug), service:vendor_services(id, name, service_scope), wedding_event:wedding_events(id, wedding_id, name, event_type, date, start_time, venue, wedding_day:wedding_days!wedding_events_wedding_day_id_fkey(id, name, date))";

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
  snapshot: InboxSnapshot,
  labelOverride?: string
): Conversation {
  const vendor = pickOne(booking.vendor);
  const client = pickOne(booking.client);
  const vendorName = vendor?.business_name?.trim() || "Vendor";
  const clientName = client?.partner_name?.trim() || "Client";
  const counterpartyName =
    labelOverride ?? (counterpartyRole === "vendor" ? vendorName : clientName);

  const projected = projectMessageRows(
    snapshot.messages,
    vendor?.user_id ?? null,
    client?.user_id ?? null,
    myUserId,
    counterpartyRole
  );

  const last = projected[projected.length - 1] ?? null;
  const context = deriveBookingContext(booking);
  const fallbackPreview =
    booking.notes?.trim() ||
    context.service?.name ||
    context.weddingEvent?.name ||
    "Inquiry waiting on a first message";

  const isParticipant =
    myUserId === vendor?.user_id || myUserId === client?.user_id;
  const inquiryCreatedAt = new Date(booking.created_at).getTime();
  const freshInquiryUnread =
    snapshot.messageCount === 0 &&
    context.status === "INQUIRY" &&
    (counterpartyRole === "client" || !isParticipant) &&
    inquiryCreatedAt >
      (snapshot.lastReadAt ? new Date(snapshot.lastReadAt).getTime() : 0);
  const unreadCount = snapshot.unreadCount + (freshInquiryUnread ? 1 : 0);
  const oldest = projected[0] ?? null;

  return {
    id: booking.id,
    vendor: counterpartyName,
    initials: initialsFor(counterpartyName),
    preview: last?.text ?? fallbackPreview,
    time: last ? relTime(last.createdAt) : statusLabel(context.status),
    createdAt: last?.createdAt ?? null,
    clientName,
    vendorName,
    counterpartyName,
    counterpartyRole,
    hasMessages: snapshot.messageCount > 0,
    unread: unreadCount > 0,
    unreadCount,
    lastReadAt: snapshot.lastReadAt,
    booking: context,
    messagePage: {
      hasOlder: snapshot.messageCount > projected.length,
      oldestCreatedAt: oldest?.createdAt ?? null,
      oldestId: oldest?.id ?? null,
      totalCount: snapshot.messageCount,
    },
    messages: projected,
  };
}

function projectMessageRows(
  messages: MessageRow[],
  vendorUserId: string | null,
  clientUserId: string | null,
  myUserId: string,
  counterpartyRole: "vendor" | "client"
): ConversationMessage[] {
  return messages.map((message) => ({
    id: message.id,
    from:
      message.sender_id === vendorUserId
        ? "vendor"
        : message.sender_id === clientUserId
          ? "client"
          : message.sender_id === myUserId
            ? counterpartyRole === "vendor"
              ? "client"
              : "vendor"
            : counterpartyRole,
    text: message.content,
    time: formatMessageTimestamp(message.created_at),
    createdAt: message.created_at,
  }));
}

function normalizeMessageRows(value: unknown): MessageRow[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const row = entry as Record<string, unknown>;
    if (
      typeof row.id !== "string" ||
      typeof row.booking_id !== "string" ||
      typeof row.sender_id !== "string" ||
      typeof row.content !== "string" ||
      typeof row.created_at !== "string"
    ) {
      return [];
    }
    return [
      {
        id: row.id,
        booking_id: row.booking_id,
        sender_id: row.sender_id,
        content: row.content,
        created_at: row.created_at,
      },
    ];
  });
}

function emptyInboxSnapshot(): InboxSnapshot {
  return {
    messages: [],
    messageCount: 0,
    unreadCount: 0,
    lastReadAt: null,
  };
}

async function loadInboxSnapshots(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
  bookingIds: string[]
) {
  const byBooking = new Map<string, InboxSnapshot>();
  if (bookingIds.length === 0) return byBooking;

  const { data, error } = await supabase.rpc("load_message_inbox_pages", {
    p_booking_ids: bookingIds,
    p_user_id: userId,
    p_recent_limit: MESSAGE_PAGE_SIZE,
  });

  if (error) {
    console.error("load_message_inbox_pages:", error);
    throw new Error("Failed to load message history");
  }

  for (const row of data ?? []) {
    byBooking.set(row.booking_id, {
      messages: normalizeMessageRows(row.messages),
      messageCount: Number(row.message_count) || 0,
      unreadCount: Number(row.unread_count) || 0,
      lastReadAt: row.last_read_at ?? null,
    });
  }
  return byBooking;
}

async function loadOlderMessagePage(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  session: AuthSession,
  searchParams: URLSearchParams
) {
  const bookingId = searchParams.get("bookingId")?.trim() ?? "";
  if (!bookingId) return null;
  if (!isUuid(bookingId)) return apiError("Invalid booking ID");

  const beforeCreatedAt = searchParams.get("beforeCreatedAt")?.trim() ?? "";
  const beforeId = searchParams.get("beforeId")?.trim() ?? "";
  if (!beforeCreatedAt || !beforeId) {
    return apiError("Both message cursor fields are required");
  }
  if (Number.isNaN(new Date(beforeCreatedAt).getTime()) || !isUuid(beforeId)) {
    return apiError("Invalid message cursor");
  }

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select(
      "id, client:client_profiles(user_id), vendor:vendor_profiles(user_id), wedding_event:wedding_events(wedding_id)"
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError) {
    console.error("bookings:", bookingError);
    return apiError("Failed to load booking", 500);
  }
  if (!booking) return apiError("Booking not found", 404);

  const client = pickOne(booking.client);
  const vendor = pickOne(booking.vendor);
  const bookingEvent = pickOne(booking.wedding_event);
  const managerScope = await loadOperationsStaffScope(session);
  const canRead =
    (session.role === "manager" &&
      (!managerScope ||
        (canReadOperationsMessages(managerScope.permissions) &&
          bookingEvent &&
          managerScope.eventIds.includes(bookingEvent.wedding_id)))) ||
    session.role === "admin" ||
    client?.user_id === session.userId ||
    vendor?.user_id === session.userId;
  if (!canRead) return apiError("Forbidden", 403);

  const { data, error } = await supabase.rpc("load_message_page", {
    p_booking_id: bookingId,
    p_before_created_at: beforeCreatedAt,
    p_before_id: beforeId,
    p_limit: MESSAGE_PAGE_QUERY_SIZE,
  });
  if (error) {
    console.error("load_message_page:", error);
    return apiError("Failed to load earlier messages", 500);
  }

  const hasOlder = (data?.length ?? 0) > MESSAGE_PAGE_SIZE;
  const rows = ((data ?? []).slice(0, MESSAGE_PAGE_SIZE) as MessageRow[]).reverse();
  const counterpartyRole = session.role === "client" ? "vendor" : "client";
  const messages = projectMessageRows(
    rows,
    vendor?.user_id ?? null,
    client?.user_id ?? null,
    session.userId,
    counterpartyRole
  );
  const oldest = messages[0] ?? null;

  return apiSuccess({
    bookingId,
    messages,
    page: {
      hasOlder,
      oldestCreatedAt: oldest?.createdAt ?? null,
      oldestId: oldest?.id ?? null,
    },
  });
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

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "client", "vendor", "admin", "manager");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();
    const messagePageResponse = await loadOlderMessagePage(
      supabase,
      session,
      new URL(request.url).searchParams
    );
    if (messagePageResponse) return messagePageResponse;

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
      const snapshots = await loadInboxSnapshots(
        supabase,
        session.userId,
        bookingIds
      );

      const conversations = sortConversations(
        bookingRows.map((booking) =>
          buildConversation(
            booking,
            "vendor",
            session.userId,
            snapshots.get(booking.id) ?? emptyInboxSnapshot()
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
      const snapshots = await loadInboxSnapshots(
        supabase,
        session.userId,
        bookingIds
      );

      const conversations = sortConversations(
        bookingRows.map((booking) =>
          buildConversation(
            booking,
            "client",
            session.userId,
            snapshots.get(booking.id) ?? emptyInboxSnapshot()
          )
        )
      );

      return apiSuccess({ conversations, needsProfile: false });
    }

    if (session.role === "manager" || session.role === "admin") {
      const managerScope = await loadOperationsStaffScope(session);
      if (
        managerScope &&
        !canReadOperationsMessages(managerScope.permissions)
      ) {
        return apiError("External message access is not enabled for this role", 403);
      }
      if (managerScope && managerScope.eventIds.length === 0) {
        return apiSuccess({ conversations: [] });
      }
      const { data: assignedFunctions, error: functionError } = managerScope
        ? await supabase
            .from("wedding_events")
            .select("id")
            .in("wedding_id", managerScope.eventIds)
        : { data: null, error: null };
      if (functionError) throw functionError;
      const functionIds = (assignedFunctions ?? []).map((event) => event.id);
      if (managerScope && functionIds.length === 0) {
        return apiSuccess({ conversations: [] });
      }
      let bookingQuery = supabase
        .from("bookings")
        .select(BOOKING_SELECT)
        .order("created_at", { ascending: false });
      if (managerScope) {
        bookingQuery = bookingQuery.in("wedding_event_id", functionIds);
      }
      const { data: bookings, error: bErr } = await bookingQuery;

      if (bErr) {
        console.error("bookings:", bErr);
        return apiError("Failed to load bookings", 500);
      }

      const bookingRows = (bookings ?? []) as BookingRow[];
      const bookingIds = bookingRows.map((b) => b.id);
      const snapshots = await loadInboxSnapshots(
        supabase,
        session.userId,
        bookingIds
      );

      const conversations = sortConversations(
        bookingRows.map((booking) => {
          const client = pickOne(booking.client);
          const vendor = pickOne(booking.vendor);
          const label = `${client?.partner_name?.trim() || "Client"} <-> ${
            vendor?.business_name?.trim() || "Vendor"
          }`;

          return buildConversation(
            booking,
            "client",
            session.userId,
            snapshots.get(booking.id) ?? emptyInboxSnapshot(),
            label
          );
        })
      );

      return apiSuccess({ conversations });
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
  const roleCheck = requireRole(session, "client", "vendor", "manager", "admin");
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
      .select("id, client:client_profiles(user_id), vendor:vendor_profiles(user_id), wedding_event:wedding_events(wedding_id)")
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
    const bookingEvent = pickOne(booking.wedding_event);
    const managerScope = await loadOperationsStaffScope(session);

    const canRead =
      (session.role === "manager" &&
        (!managerScope ||
          (canReadOperationsMessages(managerScope.permissions) &&
            bookingEvent &&
            managerScope.eventIds.includes(bookingEvent.wedding_id)))) ||
      session.role === "admin" ||
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
  const limited = await enforceRateLimit(request, {
    scope: "message-send",
    limit: 30,
    windowSeconds: 60,
    identity: session.userId,
  });
  if (limited) return limited;

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
