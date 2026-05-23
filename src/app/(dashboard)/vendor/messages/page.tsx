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
  firstMessageSuggestionsForVendor,
  formatBookingDate,
  statusTone,
  type Conversation,
  vendorPlaceholder,
} from "@/lib/messages-shared";
import { cn } from "@/lib/utils";

export default function VendorMessagesPage() {
  const searchParams = useSearchParams();
  const bookingIdParam = searchParams.get("bookingId");

  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [needsProfile, setNeedsProfile] = useState(false);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);

  async function refreshConversations() {
    try {
      const res = await fetch("/api/messages");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const list = (json.conversations ?? []) as Conversation[];
      setConversations(list);
      setNeedsProfile(Boolean(json.needsProfile));
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
          setNeedsProfile(Boolean(json.needsProfile));
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-10 w-48 bg-charcoal/10" />
        <div className="grid min-h-[520px] gap-6 lg:grid-cols-[minmax(0,320px)_1fr_minmax(0,300px)]">
          <div className="border border-charcoal/8 bg-charcoal/5" />
          <div className="border border-charcoal/8 bg-charcoal/5" />
          <div className="hidden border border-charcoal/8 bg-charcoal/5 lg:block" />
        </div>
      </div>
    );
  }

  if (needsProfile) {
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
          <p className={dashLabel}>Complete your vendor profile</p>
          <h3 className="font-display mt-2 text-2xl text-charcoal">
            Publish your business profile to receive booking conversations
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate">
            Messages are tied to real client bookings. Finish your vendor profile
            so inquiries can attach to your services and event commitments.
          </p>
          <Link
            href="/vendor/profile"
            className="font-accent mt-6 inline-flex items-center justify-center border border-gold-primary px-6 py-3 text-[11px] uppercase tracking-[0.2em] text-gold-primary transition-colors hover:bg-gold-primary hover:text-midnight"
          >
            Complete profile
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
          <p className={dashLabel}>No booking threads yet</p>
          <h3 className="font-display mt-2 text-2xl text-charcoal">
            Client conversations will appear here after an inquiry
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate">
            Every thread is linked to a booking, event, date, venue, and service
            so your team can reply with context instead of hunting through pages.
          </p>
          <Link
            href="/vendor/bookings"
            className="font-accent mt-6 inline-flex items-center justify-center border border-charcoal/15 px-6 py-3 text-[11px] uppercase tracking-[0.2em] text-charcoal transition-colors hover:border-gold-primary hover:text-gold-dark"
          >
            View bookings
          </Link>
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
          Reply to clients with the booking, wedding event, service scope, date,
          venue, and notes visible beside the conversation.
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
        />

        <ConversationPane
          conversation={current}
          draft={draft}
          onDraftChange={setDraft}
          onSend={() => void sendMessage()}
          sending={sending}
          messagesScrollRef={messagesScrollRef}
          placeholder={vendorPlaceholder(current)}
          firstMessageTips={
            current && !current.hasMessages
              ? firstMessageSuggestionsForVendor(current)
              : []
          }
          onUseTip={(tip) => setDraft(tip)}
        />

        <ContextPanel conversation={current} />
      </motion.div>
    </motion.div>
  );
}

function ConversationList({
  conversations,
  activeId,
  onSelect,
}: {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className={cn(dashCard, "flex flex-col p-0")}>
      <div className="border-b border-charcoal/8 px-4 py-3">
        <p className={dashLabel}>Client threads</p>
        <p className="mt-1 text-xs text-slate">
          {conversations.length}{" "}
          {conversations.length === 1 ? "booking" : "bookings"} ·{" "}
          {conversations.filter((c) => c.hasMessages).length} active
        </p>
      </div>
      <ul className="list-none divide-y divide-charcoal/8 pl-0">
        {conversations.map((conversation) => {
          const active = conversation.id === activeId;
          const tone = statusTone(conversation.booking.status);
          return (
            <li key={conversation.id}>
              <button
                type="button"
                onClick={() => onSelect(conversation.id)}
                className={cn(
                  "flex w-full gap-3 px-4 py-4 text-left transition-colors",
                  active ? "bg-gold-primary/5" : "hover:bg-cream/80"
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-charcoal/15 bg-midnight font-accent text-[10px] tracking-wider text-ivory">
                  {conversation.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-sm text-charcoal">
                      {conversation.counterpartyName}
                    </p>
                    {conversation.unread ? (
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
                      {conversation.booking.statusLabel}
                    </span>
                  </div>
                  <p className="font-accent mt-1 line-clamp-1 text-[10px] uppercase tracking-[0.14em] text-slate">
                    {conversation.booking.service?.name ||
                      conversation.booking.weddingEvent?.name ||
                      "Booking"}
                  </p>
                  <p className="font-heading mt-1 line-clamp-1 text-xs text-slate">
                    {conversation.preview}
                  </p>
                  <p className="font-accent mt-1 text-[9px] uppercase tracking-[0.15em] text-slate">
                    {conversation.time}
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
  firstMessageTips: string[];
  onUseTip: (tip: string) => void;
}) {
  if (!conversation) {
    return (
      <div className={cn(dashCard, "flex items-center justify-center p-10")}>
        <ListEmptyState
          title="Pick a booking"
          hint="Select a client thread to see its messages and context."
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
            <p className={dashLabel}>Reply with context</p>
            <p className="text-sm leading-relaxed text-slate">
              Start the thread for {conversation.counterpartyName}. The client
              will see your reply attached to this exact booking.
            </p>
            {firstMessageTips.length > 0 ? (
              <div className="flex flex-col gap-2">
                <p className="font-accent text-[10px] uppercase tracking-[0.16em] text-slate">
                  Suggested replies
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
          conversation.messages.map((message, index) => (
            <motion.div
              key={message.id ?? `${conversation.id}-${index}`}
              variants={staggerItem}
              className={cn(
                "flex",
                message.from === "vendor" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] border px-4 py-3",
                  message.from === "vendor"
                    ? "border-gold-primary/40 bg-gold-primary/5"
                    : "border-charcoal/12 bg-cream/50"
                )}
              >
                <p className="font-heading text-sm leading-relaxed text-charcoal">
                  {message.text}
                </p>
                <p className="font-accent mt-2 text-[9px] uppercase tracking-[0.15em] text-slate">
                  {message.time}
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

function ContextPanel({ conversation }: { conversation: Conversation | null }) {
  if (!conversation) {
    return (
      <aside className={cn(dashCard, "hidden flex-col gap-3 p-5 lg:flex")}>
        <p className={dashLabel}>Booking context</p>
        <p className="text-sm leading-relaxed text-slate">
          Select a thread to see the linked booking, event, and venue.
        </p>
      </aside>
    );
  }

  const { booking } = conversation;
  const eventDateLabel =
    formatBookingDate(booking.eventDate) ??
    formatBookingDate(booking.weddingEvent?.date ?? null);

  return (
    <aside className={cn(dashCard, "hidden flex-col gap-5 p-5 lg:flex")}>
      <div>
        <p className={dashLabel}>Booking context</p>
        <h3 className="font-display mt-2 text-lg text-charcoal">
          {conversation.counterpartyName}
        </h3>
        <p className="font-accent mt-1 text-[10px] uppercase tracking-[0.18em] text-slate">
          Client · {booking.statusLabel}
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
          href={`/vendor/bookings?bookingId=${conversation.id}`}
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
