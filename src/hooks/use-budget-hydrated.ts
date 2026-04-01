"use client";

import { useSyncExternalStore } from "react";
import { useBudgetStore } from "@/stores/budget-store";

/**
 * Zustand persist with `skipHydration: true` — rehydrate on client and expose ready state
 * without setState-in-effect (works with React Compiler / strict hooks lint).
 */
export function useBudgetHydrated(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (!useBudgetStore.persist.hasHydrated()) {
        void useBudgetStore.persist.rehydrate();
      }
      return useBudgetStore.persist.onFinishHydration(() => {
        onStoreChange();
      });
    },
    () => useBudgetStore.persist.hasHydrated(),
    () => false
  );
}
