"use client";

import { useSyncExternalStore } from "react";

interface MediaQueryStore {
  subscribe: (onChange: () => void) => () => void;
  getSnapshot: () => boolean;
}

const stores = new Map<string, MediaQueryStore>();
const getServerSnapshot = () => false;

function getMediaQueryStore(query: string): MediaQueryStore {
  const existing = stores.get(query);
  if (existing) return existing;

  let media: MediaQueryList | undefined;
  const getMedia = () => {
    media ??= window.matchMedia(query);
    return media;
  };

  const store: MediaQueryStore = {
    subscribe(onChange) {
      const queryList = getMedia();
      queryList.addEventListener("change", onChange);
      return () => queryList.removeEventListener("change", onChange);
    },
    getSnapshot() {
      return getMedia().matches;
    },
  };

  stores.set(query, store);
  return store;
}

export function useMediaQuery(query: string): boolean {
  const store = getMediaQueryStore(query);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, getServerSnapshot);
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 768px)");
}

export function useIsTablet(): boolean {
  return useMediaQuery("(max-width: 1024px)");
}
