"use client";

import { useEffect, useEffectEvent } from "react";

type MessageThread = {
  id: string;
};

type UseMessageRealtimeOptions = {
  conversations: MessageThread[];
  enabled?: boolean;
  onRefresh: () => void | Promise<void>;
};

/**
 * Keep active threads fresh through the role-checked API. Clerk identities are
 * not Supabase JWTs, so direct Postgres Realtime subscriptions would require
 * unsafe anonymous table access. Visibility-aware polling preserves the API as
 * the only data boundary until a Clerk-to-Supabase token bridge is introduced.
 */
export function useMessageRealtime({
  conversations,
  enabled = true,
  onRefresh,
}: UseMessageRealtimeOptions) {
  const refresh = useEffectEvent(() => onRefresh());
  const bookingKey = conversations
    .map((conversation) => conversation.id)
    .filter(Boolean)
    .sort()
    .join("|");

  useEffect(() => {
    if (!enabled || !bookingKey) return;

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };
    const interval = window.setInterval(refreshWhenVisible, 8_000);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [bookingKey, enabled]);
}
