export type MessageEntry = {
  id?: string;
  from: "vendor" | "client";
  text: string;
  time: string;
  createdAt?: string | null;
};

export function formatMessageTime(message: MessageEntry) {
  if (!message.createdAt) return message.time;
  const date = new Date(message.createdAt);
  if (Number.isNaN(date.getTime())) return message.time;
  return date.toLocaleString(undefined, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type BookingContext = {
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

export type Conversation = {
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
  messages: MessageEntry[];
};

export function formatBookingDate(raw: string | null) {
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function statusTone(status: string): "inquiry" | "active" | "settled" {
  const normalized = status.toLowerCase();
  if (normalized === "completed" || normalized === "cancelled") return "settled";
  if (normalized === "inquiry") return "inquiry";
  return "active";
}

export function clientPlaceholder(conversation: Conversation | null): string {
  if (!conversation) return "Type a message";
  if (!conversation.hasMessages) {
    const name = conversation.counterpartyName;
    const event = conversation.booking.weddingEvent?.name;
    if (event) {
      return `Introduce yourself to ${name} and share what you need for ${event}…`;
    }
    return `Start a conversation with ${name}…`;
  }
  return `Reply to ${conversation.counterpartyName}`;
}

export function vendorPlaceholder(conversation: Conversation | null): string {
  if (!conversation) return "Type a reply";
  if (!conversation.hasMessages) {
    const name = conversation.counterpartyName;
    const service = conversation.booking.service?.name;
    if (service) {
      return `Reply to ${name} about ${service}…`;
    }
    return `Reply to ${name}…`;
  }
  return `Reply to ${conversation.counterpartyName}`;
}

export function firstMessageSuggestionsForClient(
  conversation: Conversation
): string[] {
  const tips: string[] = [];
  const event = conversation.booking.weddingEvent;
  const service = conversation.booking.service;
  if (event) {
    tips.push(
      `Confirm availability for ${event.name}${event.date ? ` on ${formatBookingDate(event.date) ?? event.date}` : ""}.`
    );
  }
  if (service?.name) {
    tips.push(`Confirm the agreed scope and inclusions for ${service.name}.`);
  }
  if (event?.venue) {
    tips.push(`Share that the venue is ${event.venue} and ask about logistics.`);
  }
  if (tips.length === 0) {
    tips.push("Share your event date and what you're hoping for.");
    tips.push("Ask which packages match your guest count and style.");
  }
  return tips.slice(0, 3);
}

export function firstMessageSuggestionsForVendor(
  conversation: Conversation
): string[] {
  const tips: string[] = [];
  const event = conversation.booking.weddingEvent;
  const service = conversation.booking.service;
  if (service?.name) {
    tips.push(`Confirm the scope of ${service.name} and what's included.`);
  }
  if (event) {
    tips.push(
      `Confirm your availability for ${event.name}${event.date ? ` on ${formatBookingDate(event.date) ?? event.date}` : ""}.`
    );
  }
  if (event?.venue) {
    tips.push(`Ask about access and timing at ${event.venue}.`);
  }
  if (tips.length === 0) {
    tips.push("Introduce yourself and share what a typical engagement looks like.");
    tips.push("Ask for the event date, guest count, and venue.");
  }
  return tips.slice(0, 3);
}
