"use client";

import type { RefObject } from "react";
import { motion } from "framer-motion";
import { staggerItem } from "@/animations/variants";
import { ListEmptyState } from "@/components/dashboard/list-empty-state";
import { dashCard, dashLabel } from "@/lib/dashboard-styles";
import type { Conversation } from "@/lib/messages-shared";
import { cn } from "@/lib/utils";

/**
 * Shared conversation thread — the chat core (header + message bubbles +
 * composer) used by the client and vendor message inboxes so both stay
 * identical. Composer supports Enter-to-send / Shift+Enter for a new line,
 * and bubbles preserve line breaks.
 */
export function MessageThread({
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
  messagesScrollRef: RefObject<HTMLDivElement | null>;
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
                ? `Send the first message to ${conversation.counterpartyName}. They will see this booking with the event and venue attached.`
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
              className={cn("flex", m.from === selfRole ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] border px-4 py-3",
                  m.from === selfRole
                    ? "border-gold-primary/40 bg-gold-primary/5"
                    : "border-charcoal/12 bg-cream/50"
                )}
              >
                <p className="whitespace-pre-wrap font-heading text-sm leading-relaxed text-charcoal">
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
        <div className="flex items-end gap-2">
          <textarea
            rows={1}
            placeholder={placeholder}
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (canSend) onSend();
              }
            }}
            disabled={sending}
            className="max-h-32 min-h-[2.75rem] min-w-0 flex-1 resize-none border border-charcoal/15 bg-ivory px-4 py-3 font-heading text-sm outline-none transition-colors focus:border-gold-primary disabled:opacity-60"
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
        <p className="mt-2 font-accent text-[9px] uppercase tracking-[0.15em] text-slate/60">
          Enter to send · Shift + Enter for a new line
        </p>
      </form>
    </div>
  );
}
