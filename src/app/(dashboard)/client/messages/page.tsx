"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { fadeUp, staggerContainer, staggerItem } from "@/animations/variants";
import { ListEmptyState } from "@/components/dashboard/list-empty-state";
import { useMessageRealtime } from "@/hooks/use-message-realtime";
import { dashCard, dashLabel, statusBadgeBase } from "@/lib/dashboard-styles";
import {
  clientPlaceholder,
  firstMessageSuggestionsForClient,
  formatBookingDate,
  statusTone,
  type Conversation,
} from "@/lib/messages-shared";
import { cn } from "@/lib/utils";

export default function ClientMessagesPage() {
  const searchParams = useSearchParams();
  const bookingIdParam = searchParams.get("bookingId");

  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);

  async function refreshConversations() {
    try {
      const res = await fetch("/api/messages");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const list = (json.conversations ?? []) as Conversation[];
      setConversations(list);
      setNeedsOnboarding(Boolean(json.needsOnboarding));
      setActive((currentActive) => {
        if (currentActive && list.some((conversation) => conversation.id === currentActive)) {
          return currentActive;
        }
        if (bookingIdParam && list.some((conversation) => conversation.id === bookingIdParam)) {
          return bookingIdParam;
        }
        return list[0]?.id ?? null;
      });
    } catch {
      toast.error("Could not refresh live messages");
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/messages");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        const list = (json.conversations ?? []) as Conversation[];
        if (!cancelled) {
          setConversations(list);
          setNeedsOnboarding(Boolean(json.needsOnboarding));
          const initial =
            (bookingIdParam && list.find((c) => c.id === bookingIdParam)?.id) ||
            list[0]?.id ||
            null;
          setActive(initial);
        }
      } catch {
        if (!cancelled) {
          setConversations([]);
          setActive(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingIdParam]);

  useEffect(() => {
    if (bookingIdParam) setActive(bookingIdParam);
  }, [bookingIdParam]);

  useMessageRealtime({
    conversations,
    enabled: !loading && conversations.length > 0,
    onRefresh: refreshConversations,
  });

  const current = useMemo(
    () => conversations.find((c) => c.id === active) ?? null,
    [conversations, active]
  );
  const currentId = current?.id ?? null;
  const currentUnread = Boolean(current?.unread);

  useEffect(() => {
    if (!messagesScrollRef.current) return;
    messagesScrollRef.current.scrollTop = messagesScrollRef.current.scrollHeight;
  }, [current?.id, current?.messages.length]);

  useEffect(() => {
    if (!currentId || !currentUnread) return;
    const optimisticReadAt = new Date().toISOString();
    setConversations((list) =>
      list.map((conversation) =>
        conversation.id === currentId
          ? {
              ...conversation,
              unread: false,
              unreadCount: 0,
              lastReadAt: optimisticReadAt,
            }
          : conversation
      )
    );

    void fetch("/api/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: currentId }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Read update failed");
        if (!json.readAt) return;
        setConversations((list) =>
          list.map((conversation) =>
            conversation.id === currentId
              ? { ...conversation, lastReadAt: json.readAt }
              : conversation
          )
        );
      })
      .catch(() => {
        setConversations((list) =>
          list.map((conversation) =>
            conversation.id === currentId
              ? {
                  ...conversation,
                  unread: true,
                  unreadCount: Math.max(1, conversation.unreadCount),
                }
              : conversation
          )
        );
      });
  }, [currentId, currentUnread]);

  const sendMessage = async () => {
    if (!current) return;
    const trimmed = draft.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: current.id, content: trimmed }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      const message = json.message as {
        id: string;
        from: "vendor" | "client";
        text: string;
        time: string;
      };

      setConversations((list) => {
        const updated = list.map((conversation) =>
          conversation.id === current.id
            ? {
                ...conversation,
                preview: message.text,
                time: "Just now",
                createdAt: new Date().toISOString(),
                hasMessages: true,
                unread: false,
                unreadCount: 0,
                lastReadAt: new Date().toISOString(),
                messages: [
                  ...conversation.messages,
                  {
                    id: message.id,
                    from: message.from,
                    text: message.text,
                    time: message.time,
                  },
                ],
              }
            : conversation
        );
        const index = updated.findIndex((c) => c.id === current.id);
        if (index > 0) {
          const [conversation] = updated.splice(index, 1);
          updated.unshift(conversation);
        }
        return updated;
      });
      setDraft("");
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-10 w-48 bg-charcoal/10" />
        <div className="grid min-h-[400px] gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
          <div className="border border-charcoal/8 bg-charcoal/5" />
          <div className="border border-charcoal/8 bg-charcoal/5" />
        </div>
      </div>
    );
  }

  if (needsOnboarding) {
    return (
      <motion.div variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div variants={fadeUp}>
          <p className={dashLabel}>Inbox</p>
          <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">
            Messages
          </h2>
        </motion.div>
        <motion.div
          variants={fadeUp}
          className="mt-12 border border-charcoal/8 bg-cream/30 p-8"
        >
          <p className={dashLabel}>Set up your wedding first</p>
          <h3 className="font-display mt-2 text-2xl text-charcoal">
            Complete onboarding to start conversations
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate">
            Messages are tied to bookings on your wedding. Finish onboarding so
            vendors can be linked to the right event and day.
          </p>
          <Link
            href="/client/onboarding"
            className="font-accent mt-6 inline-flex items-center justify-center border border-gold-primary px-6 py-3 text-[11px] uppercase tracking-[0.2em] text-gold-primary transition-colors hover:bg-gold-primary hover:text-midnight"
          >
            Complete onboarding
          </Link>
        </motion.div>
      </motion.div>
    );
  }

  if (conversations.length === 0) {
    return (
      <motion.div variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div variants={fadeUp}>
          <p className={dashLabel}>Inbox</p>
          <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">
            Messages
          </h2>
        </motion.div>
        <motion.div
          variants={fadeUp}
          className="mt-12 border border-charcoal/8 bg-cream/30 p-8"
        >
          <p className={dashLabel}>No bookings yet</p>
          <h3 className="font-display mt-2 text-2xl text-charcoal">
            Reach a vendor first to start a thread
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate">
            Messaging here is tied to real bookings. Shortlist a vendor and send
            an inquiry — the conversation will land here, organized by event and
            day.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/client/vendors"
              className="font-accent inline-flex items-center justify-center border border-gold-primary px-6 py-3 text-[11px] uppercase tracking-[0.2em] text-gold-primary transition-colors hover:bg-gold-primary hover:text-midnight"
            >
              Browse vendors
            </Link>
            <Link
              href="/client/bookings"
              className="font-accent inline-flex items-center justify-center border border-charcoal/15 px-6 py-3 text-[11px] uppercase tracking-[0.2em] text-charcoal transition-colors hover:border-gold-primary hover:text-gold-dark"
            >
              View your bookings
            </Link>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div variants={fadeUp}>
        <p className={dashLabel}>Inbox</p>
        <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">
          Messages
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate">
          Every thread is tied to a real booking. Switch between conversations to
          see the service, the wedding event, the day, and the venue without
          leaving the inbox.
        </p>
      </motion.div>

      <motion.div
        variants={fadeUp}
        className="mt-10 grid min-h-[520px] grid-cols-1 gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)_minmax(0,300px)]"
      >
        <ConversationList
          conversations={conversations}
          activeId={current?.id ?? null}
          onSelect={setActive}
          counterpartyLabel="Vendor"
        />

        <ConversationPane
          conversation={current}
          draft={draft}
          onDraftChange={setDraft}
          onSend={() => void sendMessage()}
          sending={sending}
          messagesScrollRef={messagesScrollRef}
          placeholder={clientPlaceholder(current)}
          selfRole="client"
          firstMessageTips={
            current && !current.hasMessages
              ? firstMessageSuggestionsForClient(current)
              : []
          }
          onUseTip={(tip) => setDraft(tip)}
        />

        <ContextPanel conversation={current} viewer="client" />
      </motion.div>
    </motion.div>
  );
}

function ConversationList({
  conversations,
  activeId,
  onSelect,
  counterpartyLabel,
}: {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  counterpartyLabel: string;
}) {
  return (
    <div className={cn(dashCard, "flex flex-col p-0")}>
      <div className="border-b border-charcoal/8 px-4 py-3">
        <p className={dashLabel}>Conversations</p>
        <p className="mt-1 text-xs text-slate">
          {conversations.length}{" "}
          {conversations.length === 1 ? "booking" : "bookings"} ·{" "}
          {conversations.filter((c) => c.hasMessages).length} active
        </p>
      </div>
      <ul className="list-none divide-y divide-charcoal/8 pl-0">
        {conversations.map((c) => {
          const on = c.id === activeId;
          const tone = statusTone(c.booking.status);
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSelect(c.id)}
                className={cn(
                  "flex w-full gap-3 px-4 py-4 text-left transition-colors",
                  on ? "bg-gold-primary/5" : "hover:bg-cream/80"
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-charcoal/15 bg-midnight font-accent text-[10px] tracking-wider text-ivory">
                  {c.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-sm text-charcoal">{c.vendor}</p>
                    {c.unread ? (
                      <span className="font-accent rounded-full bg-gold-primary px-2 py-0.5 text-[8px] uppercase tracking-[0.14em] text-midnight">
                        Unread
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        statusBadgeBase,
                        tone === "inquiry" && "border-gold-primary/60 text-gold-dark",
                        tone === "active" && "border-sage/40 text-sage",
                        tone === "settled" && "border-charcoal/20 text-slate"
                      )}
                    >
                      {c.booking.statusLabel}
                    </span>
                  </div>
                  <p className="font-accent mt-1 line-clamp-1 text-[10px] uppercase tracking-[0.14em] text-slate">
                    {c.booking.service?.name ||
                      c.booking.weddingEvent?.name ||
                      counterpartyLabel}
                  </p>
                  <p className="font-heading mt-1 line-clamp-1 text-xs text-slate">
                    {c.preview}
                  </p>
                  <p className="font-accent mt-1 text-[9px] uppercase tracking-[0.15em] text-slate">
                    {c.time}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ConversationPane({
  conversation,
  draft,
  onDraftChange,
  onSend,
  sending,
  messagesScrollRef,
  placeholder,
  selfRole,
  firstMessageTips,
  onUseTip,
}: {
  conversation: Conversation | null;
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  sending: boolean;
  messagesScrollRef: React.RefObject<HTMLDivElement | null>;
  placeholder: string;
  selfRole: "client" | "vendor";
  firstMessageTips: string[];
  onUseTip: (tip: string) => void;
}) {
  if (!conversation) {
    return (
      <div className={cn(dashCard, "flex items-center justify-center p-10")}>
        <ListEmptyState
          title="Pick a booking"
          hint="Select a conversation from the list to see its thread and context."
        />
      </div>
    );
  }

  const canSend = draft.trim().length > 0 && !sending;

  return (
    <div className={cn(dashCard, "flex flex-col p-0")}>
      <div className="flex items-center gap-3 border-b border-charcoal/8 px-6 py-4">
        <div className="flex h-11 w-11 items-center justify-center border border-charcoal/15 bg-midnight font-accent text-[11px] text-ivory">
          {conversation.initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg text-charcoal">
            {conversation.counterpartyName}
          </p>
          <p className={dashLabel}>
            {conversation.booking.statusLabel} ·{" "}
            {conversation.booking.service?.name ||
              conversation.booking.weddingEvent?.name ||
              "Booking"}
          </p>
        </div>
      </div>

      <div
        ref={messagesScrollRef}
        className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-6"
      >
        {conversation.messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-start justify-center gap-3 border border-dashed border-charcoal/15 bg-cream/30 p-6">
            <p className={dashLabel}>Start the thread</p>
            <p className="text-sm leading-relaxed text-slate">
              {selfRole === "client"
                ? `Send the first message to ${conversation.counterpartyName}. They will see this booking with the wedding event and venue attached.`
                : `Send the first reply to ${conversation.counterpartyName}. They will see this thread on their booking.`}
            </p>
            {firstMessageTips.length > 0 ? (
              <div className="flex flex-col gap-2">
                <p className="font-accent text-[10px] uppercase tracking-[0.16em] text-slate">
                  Suggested openers
                </p>
                <div className="flex flex-wrap gap-2">
                  {firstMessageTips.map((tip) => (
                    <button
                      key={tip}
                      type="button"
                      onClick={() => onUseTip(tip)}
                      className="border border-charcoal/15 bg-ivory px-3 py-2 text-left font-heading text-xs leading-snug text-charcoal transition-colors hover:border-gold-primary hover:text-gold-dark"
                    >
                      {tip}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          conversation.messages.map((m, i) => (
            <motion.div
              key={m.id ?? `${conversation.id}-${i}`}
              variants={staggerItem}
              className={cn(
                "flex",
                m.from === selfRole ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] border px-4 py-3",
                  m.from === selfRole
                    ? "border-gold-primary/40 bg-gold-primary/5"
                    : "border-charcoal/12 bg-cream/50"
                )}
              >
                <p className="font-heading text-sm leading-relaxed text-charcoal">
                  {m.text}
                </p>
                <p className="font-accent mt-2 text-[9px] uppercase tracking-[0.15em] text-slate">
                  {m.time}
                </p>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <form
        className="border-t border-charcoal/8 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSend) onSend();
        }}
      >
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={placeholder}
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            disabled={sending}
            className="min-w-0 flex-1 border border-charcoal/15 bg-ivory px-4 py-3 font-heading text-sm outline-none transition-colors focus:border-gold-primary disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!canSend}
            className={cn(
              "font-accent shrink-0 border px-5 py-3 text-[11px] uppercase tracking-[0.2em] transition-colors",
              canSend
                ? "border-gold-primary bg-transparent text-gold-primary hover:bg-gold-primary hover:text-midnight"
                : "cursor-not-allowed border-charcoal/15 text-slate"
            )}
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ContextPanel({
  conversation,
  viewer,
}: {
  conversation: Conversation | null;
  viewer: "client" | "vendor";
}) {
  if (!conversation) {
    return (
      <aside className={cn(dashCard, "hidden lg:flex flex-col gap-3 p-5")}>
        <p className={dashLabel}>Booking context</p>
        <p className="text-sm leading-relaxed text-slate">
          Select a conversation to see the linked booking, event, and venue.
        </p>
      </aside>
    );
  }

  const { booking } = conversation;
  const eventDateLabel =
    formatBookingDate(booking.eventDate) ??
    formatBookingDate(booking.weddingEvent?.date ?? null);

  return (
    <aside className={cn(dashCard, "hidden lg:flex flex-col gap-5 p-5")}>
      <div>
        <p className={dashLabel}>Booking context</p>
        <h3 className="font-display mt-2 text-lg text-charcoal">
          {conversation.counterpartyName}
        </h3>
        <p className="font-accent mt-1 text-[10px] uppercase tracking-[0.18em] text-slate">
          {viewer === "client" ? "Your vendor" : "Your client"} ·{" "}
          {booking.statusLabel}
        </p>
      </div>

      <ContextRow label="Service" value={booking.service?.name ?? null} />
      <ContextRow label="Service scope" value={booking.service?.scope ?? null} />
      <ContextRow
        label="Wedding event"
        value={booking.weddingEvent?.name ?? null}
        secondary={booking.weddingEvent?.eventType ?? null}
      />
      <ContextRow
        label="Wedding day"
        value={booking.weddingDay?.name ?? null}
        secondary={formatBookingDate(booking.weddingDay?.date ?? null)}
      />
      <ContextRow label="Event date" value={eventDateLabel} />
      <ContextRow label="Start time" value={booking.weddingEvent?.startTime ?? null} />
      <ContextRow label="Venue" value={booking.weddingEvent?.venue ?? null} />

      {booking.notes ? (
        <div>
          <p className="font-accent text-[10px] uppercase tracking-[0.18em] text-slate">
            Booking notes
          </p>
          <p className="mt-2 text-sm leading-relaxed text-charcoal">
            {booking.notes}
          </p>
        </div>
      ) : null}

      <div className="mt-auto flex flex-col gap-2 border-t border-charcoal/8 pt-4">
        <Link
          href={`/client/bookings?bookingId=${conversation.id}`}
          className="font-accent inline-flex items-center justify-center border border-charcoal/15 px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] text-charcoal transition-colors hover:border-gold-primary hover:text-gold-dark"
        >
          Open booking
        </Link>
      </div>
    </aside>
  );
}

function ContextRow({
  label,
  value,
  secondary,
}: {
  label: string;
  value: string | null;
  secondary?: string | null;
}) {
  if (!value && !secondary) {
    return (
      <div>
        <p className="font-accent text-[10px] uppercase tracking-[0.18em] text-slate">
          {label}
        </p>
        <p className="mt-1 text-sm text-slate/70">Not set yet</p>
      </div>
    );
  }
  return (
    <div>
      <p className="font-accent text-[10px] uppercase tracking-[0.18em] text-slate">
        {label}
      </p>
      {value ? (
        <p className="mt-1 text-sm leading-relaxed text-charcoal">{value}</p>
      ) : null}
      {secondary ? (
        <p className="mt-0.5 text-xs leading-relaxed text-slate">{secondary}</p>
      ) : null}
    </div>
  );
}
