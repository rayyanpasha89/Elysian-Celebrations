"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer, staggerItem } from "@/animations/variants";
import { ListEmptyState } from "@/components/dashboard/list-empty-state";
import { useMessageRealtime } from "@/hooks/use-message-realtime";
import { dashCard, dashLabel, statusBadgeBase } from "@/lib/dashboard-styles";
import {
  formatBookingDate,
  formatMessageTime,
  statusTone,
  type Conversation,
} from "@/lib/messages-shared";
import { cn } from "@/lib/utils";

export default function ManagerMessagesPage() {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);

  async function refreshConversations() {
    try {
      const res = await fetch("/api/messages");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load messages");
      const list = (json.conversations ?? []) as Conversation[];
      setConversations(list);
      setActive((currentActive) => {
        if (currentActive && list.some((conversation) => conversation.id === currentActive)) {
          return currentActive;
        }
        return list[0]?.id ?? null;
      });
    } catch {
      // Keep the current command-center state; the next realtime event or reload can recover.
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/messages");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load messages");
        const list = (json.conversations ?? []) as Conversation[];
        if (!cancelled) {
          setConversations(list);
          setActive(list[0]?.id ?? null);
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
  }, []);

  useMessageRealtime({
    conversations,
    enabled: !loading && conversations.length > 0,
    onRefresh: refreshConversations,
  });

  const current = useMemo(
    () => conversations.find((conversation) => conversation.id === active) ?? null,
    [active, conversations]
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
    }).catch(() => {
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

  const totals = useMemo(
    () => ({
      threads: conversations.length,
      unread: conversations.filter((conversation) => conversation.unread).length,
      active: conversations.filter(
        (conversation) => statusTone(conversation.booking.status) === "active"
      ).length,
      inquiries: conversations.filter(
        (conversation) => conversation.booking.status === "INQUIRY"
      ).length,
    }),
    [conversations]
  );

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-10 w-56 bg-charcoal/10" />
        <div className="grid min-h-[520px] gap-6 xl:grid-cols-[340px_1fr_320px]">
          <div className="border border-charcoal/8 bg-charcoal/5" />
          <div className="border border-charcoal/8 bg-charcoal/5" />
          <div className="hidden border border-charcoal/8 bg-charcoal/5 xl:block" />
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div variants={fadeUp} className="flex flex-col gap-3">
        <p className={dashLabel}>Operations</p>
        <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">
          Message Command
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-slate">
          Read client-vendor conversations in context, with booking status,
          service scope, wedding day, venue, and notes beside the thread.
        </p>
      </motion.div>

      <motion.div variants={fadeUp} className="mt-8 grid gap-3 md:grid-cols-4">
        <ManagerMessageMetric label="Threads" value={String(totals.threads)} />
        <ManagerMessageMetric label="Unread" value={String(totals.unread)} />
        <ManagerMessageMetric label="Active" value={String(totals.active)} />
        <ManagerMessageMetric label="Inquiries" value={String(totals.inquiries)} />
      </motion.div>

      {conversations.length === 0 ? (
        <motion.div variants={fadeUp} className="mt-10">
          <ListEmptyState
            title="No booking conversations yet"
            hint="Threads appear here once clients and vendors have bookings or messages."
          />
        </motion.div>
      ) : (
        <motion.div
          variants={fadeUp}
          className="mt-10 grid min-h-[560px] gap-6 xl:grid-cols-[340px_minmax(0,1fr)_320px]"
        >
          <ConversationQueue
            conversations={conversations}
            activeId={current?.id ?? null}
            onSelect={setActive}
          />
          <ThreadPanel
            conversation={current}
            messagesScrollRef={messagesScrollRef}
          />
          <ManagerContextPanel conversation={current} />
        </motion.div>
      )}
    </motion.div>
  );
}

function ConversationQueue({
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
        <p className={dashLabel}>Conversation queue</p>
        <p className="mt-1 text-xs text-slate">
          {conversations.filter((conversation) => conversation.hasMessages).length}{" "}
          active threads
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
                      {conversation.clientName}
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
                    {conversation.vendorName}
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

function ThreadPanel({
  conversation,
  messagesScrollRef,
}: {
  conversation: Conversation | null;
  messagesScrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  if (!conversation) {
    return (
      <div className={cn(dashCard, "flex items-center justify-center p-10")}>
        <ListEmptyState
          title="Pick a thread"
          hint="Select a client-vendor conversation to inspect the message history."
        />
      </div>
    );
  }

  return (
    <div className={cn(dashCard, "flex flex-col p-0")}>
      <div className="border-b border-charcoal/8 px-6 py-4">
        <p className={dashLabel}>Thread</p>
        <h3 className="mt-2 font-display text-xl text-charcoal">
          {conversation.clientName} {"<->"} {conversation.vendorName}
        </h3>
        <p className="mt-1 text-sm text-slate">
          {conversation.booking.service?.name ??
            conversation.booking.weddingEvent?.name ??
            "Booking conversation"}
        </p>
      </div>

      <div
        ref={messagesScrollRef}
        className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-6"
      >
        {conversation.messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-start justify-center border border-dashed border-charcoal/15 bg-cream/30 p-6">
            <p className={dashLabel}>No messages yet</p>
            <p className="mt-2 text-sm leading-relaxed text-slate">
              This is an inquiry or booking thread waiting for the first client or
              vendor reply.
            </p>
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
                <p className="font-accent mb-2 text-[9px] uppercase tracking-[0.15em] text-slate">
                  {message.from === "vendor"
                    ? conversation.vendorName
                    : conversation.clientName}
                </p>
                <p className="font-heading text-sm leading-relaxed text-charcoal">
                  {message.text}
                </p>
                <p className="font-accent mt-2 text-[9px] uppercase tracking-[0.15em] text-slate">
                  {formatMessageTime(message)}
                </p>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

function ManagerContextPanel({
  conversation,
}: {
  conversation: Conversation | null;
}) {
  if (!conversation) {
    return (
      <aside className={cn(dashCard, "hidden flex-col gap-3 p-5 xl:flex")}>
        <p className={dashLabel}>Booking context</p>
        <p className="text-sm leading-relaxed text-slate">
          Select a thread to see its operational context.
        </p>
      </aside>
    );
  }

  const { booking } = conversation;
  const eventDateLabel =
    formatBookingDate(booking.eventDate) ??
    formatBookingDate(booking.weddingEvent?.date ?? null);

  return (
    <aside className={cn(dashCard, "hidden flex-col gap-5 p-5 xl:flex")}>
      <div>
        <p className={dashLabel}>Booking context</p>
        <h3 className="font-display mt-2 text-lg text-charcoal">
          {conversation.clientName}
        </h3>
        <p className="font-accent mt-1 text-[10px] uppercase tracking-[0.18em] text-slate">
          {conversation.vendorName} · {booking.statusLabel}
        </p>
      </div>

      <ContextRow label="Service" value={booking.service?.name ?? null} />
      <ContextRow label="Service scope" value={booking.service?.scope ?? null} />
      <ContextRow
        label="Function"
        value={booking.weddingEvent?.name ?? null}
        secondary={booking.weddingEvent?.eventType ?? null}
      />
      <ContextRow
        label="Event day"
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

      <div className="mt-auto grid gap-2 border-t border-charcoal/8 pt-4">
        <Link
          href={`/manager/bookings?bookingId=${conversation.id}`}
          className="font-accent inline-flex items-center justify-center border border-charcoal/15 px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] text-charcoal transition-colors hover:border-gold-primary hover:text-gold-dark"
        >
          Open booking
        </Link>
        <Link
          href="/manager/bookings"
          className="font-accent inline-flex items-center justify-center border border-gold-primary/45 px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] text-gold-dark transition-colors hover:bg-gold-primary/10"
        >
          Booking command
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

function ManagerMessageMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border border-charcoal/8 bg-cream/40 p-3">
      <p className="font-accent text-[10px] uppercase tracking-[0.15em] text-slate">
        {label}
      </p>
      <p className="mt-2 font-display text-lg text-charcoal">{value}</p>
    </div>
  );
}
