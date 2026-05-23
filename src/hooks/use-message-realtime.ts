"use client";

import { useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

type MessageThread = {
  id: string;
};

type UseMessageRealtimeOptions = {
  conversations: MessageThread[];
  enabled?: boolean;
  onRefresh: () => void | Promise<void>;
};

/**
 * Subscribe per booking so the browser never needs to process unrelated
 * message payloads. The API remains the source of truth for role checks and
 * message projection; realtime only tells us when to refresh.
 */
export function useMessageRealtime({
  conversations,
  enabled = true,
  onRefresh,
}: UseMessageRealtimeOptions) {
  const refreshRef = useRef(onRefresh);

  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  const bookingKey = useMemo(() => {
    return conversations
      .map((conversation) => conversation.id)
      .filter(Boolean)
      .sort()
      .join("|");
  }, [conversations]);

  useEffect(() => {
    if (!enabled || !bookingKey) return;

    const supabase = createClient();
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = () => {
      if (refreshTimer) return;
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        void refreshRef.current();
      }, 450);
    };

    const channels = bookingKey.split("|").map((bookingId) =>
      supabase
        .channel(`elysian-messages:${bookingId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `booking_id=eq.${bookingId}`,
          },
          scheduleRefresh
        )
        .subscribe()
    );

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      channels.forEach((channel) => {
        void supabase.removeChannel(channel);
      });
    };
  }, [bookingKey, enabled]);
}
