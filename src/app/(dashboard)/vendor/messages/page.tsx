"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { fadeUp, staggerContainer, staggerItem } from "@/animations/variants";
import { ListEmptyState } from "@/components/dashboard/list-empty-state";
import { dashCard, dashLabel, statusBadgeBase } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type Conv = {
  id: string;
  couple: string;
  initials: string;
  preview: string;
  time: string;
  unread?: boolean;
  messages: { from: "vendor" | "client"; text: string; time: string }[];
};

type BookingRow = {
  id: string;
  status: string;
  event_date: string | null;
  notes?: string | null;
  client: { partner_name?: string } | null;
  service: { name?: string } | null;
};

function initialsFor(name: string) {
  return name
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function bookingToConversation(booking: BookingRow): Conv {
  const name = booking.client?.partner_name ?? "Client";
  return {
    id: booking.id,
    couple: name,
    initials: initialsFor(name),
    preview:
      booking.notes?.trim() ||
      booking.service?.name ||
      "Inquiry waiting for your reply",
    time: booking.event_date
      ? new Date(booking.event_date).toLocaleDateString("en-IN", {
          weekday: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "New inquiry",
    unread: booking.status === "INQUIRY",
    messages: [],
  };
}

export default function VendorMessagesPage() {
  const searchParams = useSearchParams();
  const bookingIdParam = searchParams.get("bookingId");
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conv[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [messagesRes, bookingsRes] = await Promise.all([
          fetch("/api/messages"),
          fetch("/api/bookings"),
        ]);
        const messagesJson = await messagesRes.json();
        const bookingsJson = await bookingsRes.json();
        if (!messagesRes.ok) throw new Error(messagesJson.error);
        if (!bookingsRes.ok) throw new Error(bookingsJson.error);

        const raw = messagesJson.conversations ?? [];
        const mapped: Conv[] = raw.map(
          (c: {
            id: string;
            vendor: string;
            initials: string;
            preview: string;
            time: string;
            messages: { from: "vendor" | "client"; text: string; time: string }[];
          }) => ({
            id: c.id,
            couple: c.vendor,
            initials: c.initials,
            preview: c.preview,
            time: c.time,
            messages: c.messages,
          })
        );

        const bookingRows = (bookingsJson.bookings ?? []) as BookingRow[];
        if (!cancelled) {
          setConversations(mapped);
          setBookings(bookingRows);
          if (bookingIdParam) {
            setActive(bookingIdParam);
          } else if (mapped[0]?.id) {
            setActive(mapped[0].id);
          } else if (bookingRows[0]?.id) {
            setActive(bookingRows[0].id);
          }
        }
      } catch {
        if (!cancelled) {
          setConversations([]);
          setBookings([]);
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
    if (bookingIdParam) {
      setActive(bookingIdParam);
    }
  }, [bookingIdParam]);

  const selectedId =
    active ?? bookingIdParam ?? conversations[0]?.id ?? bookings[0]?.id ?? null;

  const current = useMemo(() => {
    if (!selectedId) return null;
    const existing = conversations.find((c) => c.id === selectedId);
    if (existing) return existing;
    const booking = bookings.find((b) => b.id === selectedId);
    return booking ? bookingToConversation(booking) : null;
  }, [bookings, conversations, selectedId]);

  const displayConversations = useMemo(() => {
    if (!current) return conversations;
    const exists = conversations.some((conversation) => conversation.id === current.id);
    if (exists) return conversations;
    return [current, ...conversations];
  }, [conversations, current]);

  const sendMessage = async () => {
    if (!current || !draft.trim()) return;

    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: current.id,
          content: draft.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      const message = json.message as {
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
                messages: [...conversation.messages, message],
              }
            : conversation
        );
        const index = updated.findIndex((conversation) => conversation.id === current.id);
        if (index > 0) {
          const [conversation] = updated.splice(index, 1);
          updated.unshift(conversation);
        } else if (index === -1) {
          updated.unshift({
            ...current,
            preview: message.text,
            time: "Just now",
            messages: [message],
          });
        }
        return updated;
      });
      setDraft("");
    } catch {
      toast.error("Failed to send reply");
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

  if (!current) {
    return (
      <motion.div variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div variants={fadeUp}>
          <p className={dashLabel}>Inbox</p>
          <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">Messages</h2>
        </motion.div>
        <div className="mt-12">
          <ListEmptyState hint="Client messages appear here when there is activity on a booking." />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div variants={fadeUp}>
        <p className={dashLabel}>Inbox</p>
        <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">Messages</h2>
      </motion.div>

      <motion.div variants={fadeUp} className="mt-10 grid min-h-[480px] grid-cols-1 gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
        <div className={cn(dashCard, "flex flex-col p-0")}>
          <div className="border-b border-charcoal/8 px-4 py-3">
            <p className={dashLabel}>Conversations</p>
          </div>
          <ul className="list-none divide-y divide-charcoal/8 pl-0">
            {displayConversations.map((c) => {
              const on = c.id === selectedId;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setActive(c.id)}
                    className={cn(
                      "flex w-full gap-3 px-4 py-4 text-left transition-colors",
                      on ? "bg-gold-primary/5" : "hover:bg-cream/80"
                    )}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-charcoal/15 bg-midnight font-accent text-[10px] tracking-wider text-ivory">
                      {c.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-display text-sm text-charcoal">{c.couple}</p>
                        {c.unread ? (
                          <span className={cn(statusBadgeBase, "border-gold-primary/60 text-gold-dark")}>
                            Inquiry
                          </span>
                        ) : null}
                      </div>
                      <p className="font-heading mt-1 line-clamp-1 text-xs text-slate">{c.preview}</p>
                      <p className="font-accent mt-1 text-[9px] uppercase tracking-[0.15em] text-slate">{c.time}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className={cn(dashCard, "flex flex-col p-0")}>
          <div className="flex items-center gap-3 border-b border-charcoal/8 px-6 py-4">
            <div className="flex h-11 w-11 items-center justify-center border border-charcoal/15 bg-midnight font-accent text-[11px] text-ivory">
              {current.initials}
            </div>
            <div>
              <p className="font-display text-lg text-charcoal">{current.couple}</p>
              <p className={dashLabel}>{current.unread ? "Inquiry" : "Client"}</p>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-6">
            {current.messages.map((m, i) => (
              <motion.div
                key={`${current.id}-${i}`}
                variants={staggerItem}
                className={cn("flex", m.from === "vendor" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] border px-4 py-3",
                    m.from === "vendor"
                      ? "border-gold-primary/40 bg-gold-primary/5"
                      : "border-charcoal/12 bg-cream/50"
                  )}
                >
                  <p className="font-heading text-sm leading-relaxed text-charcoal">{m.text}</p>
                  <p className="font-accent mt-2 text-[9px] uppercase tracking-[0.15em] text-slate">{m.time}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <form
            className="border-t border-charcoal/8 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage();
            }}
          >
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type a reply"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                className="min-w-0 flex-1 border border-charcoal/15 bg-ivory px-4 py-3 font-heading text-sm outline-none focus:border-gold-primary"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="font-accent shrink-0 border border-gold-primary bg-transparent px-5 py-3 text-[11px] uppercase tracking-[0.2em] text-gold-primary transition-colors hover:bg-gold-primary hover:text-midnight"
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}
