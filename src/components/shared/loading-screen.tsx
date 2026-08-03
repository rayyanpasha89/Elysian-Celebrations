"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-media-query";

const STORAGE_KEY = "elysian-loading-screen-done";
const MIN_VISIBLE_MS = 900;
const MAX_WAIT_MS = 1600;

const subscribeToHydration = () => () => {};
const getHydratedSnapshot = () => true;
const getServerSnapshot = () => false;

function hasCompletedThisSession() {
  try {
    return typeof sessionStorage !== "undefined" && Boolean(sessionStorage.getItem(STORAGE_KEY));
  } catch {
    return true;
  }
}

function rememberCompletion() {
  try {
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Storage can be unavailable in private or restricted browsing contexts.
  }
}

const letterContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const letterItem = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function LoadingScreen({ onComplete }: { onComplete?: () => void }) {
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerSnapshot
  );
  const prefersReducedMotion = usePrefersReducedMotion();
  const [show, setShow] = useState(false);
  const onCompleteRef = useRef(onComplete);
  const didCompleteRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const completeOnce = useCallback(() => {
    if (didCompleteRef.current) return;
    didCompleteRef.current = true;
    rememberCompletion();
    onCompleteRef.current?.();
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const shouldReduceMotion =
      prefersReducedMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (hasCompletedThisSession() || shouldReduceMotion) {
      startTransition(() => setShow(false));
      completeOnce();
      return;
    }

    startTransition(() => setShow(true));
  }, [completeOnce, mounted, prefersReducedMotion]);

  useEffect(() => {
    if (!show || prefersReducedMotion) return;

    let pageReady = document.readyState === "complete";
    let minimumElapsed = false;

    const dismissWhenReady = () => {
      if (pageReady && minimumElapsed) setShow(false);
    };

    const onPageReady = () => {
      pageReady = true;
      dismissWhenReady();
    };

    if (!pageReady) window.addEventListener("load", onPageReady, { once: true });

    const minimumTimer = window.setTimeout(() => {
      minimumElapsed = true;
      dismissWhenReady();
    }, MIN_VISIBLE_MS);

    const maximumTimer = window.setTimeout(() => setShow(false), MAX_WAIT_MS);

    return () => {
      window.removeEventListener("load", onPageReady);
      window.clearTimeout(minimumTimer);
      window.clearTimeout(maximumTimer);
    };
  }, [prefersReducedMotion, show]);

  if (!mounted) return null;

  return (
    <AnimatePresence
      onExitComplete={completeOnce}
    >
      {show && (
        <motion.div
          key="loading-screen"
          className="pointer-events-none fixed inset-0 z-[9990] flex flex-col items-center justify-center bg-ivory"
          initial={{ y: 0 }}
          exit={{ y: "-100%" }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const }
          }
        >
          <motion.div
            className="flex flex-col items-center gap-6 px-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="font-display flex text-[clamp(2.5rem,10vw,4.5rem)] font-semibold tracking-tight text-charcoal"
              variants={letterContainer}
              initial="hidden"
              animate="visible"
            >
              {"Elysian".split("").map((ch, i) => (
                <motion.span key={`${ch}-${i}`} variants={letterItem} className="inline-block">
                  {ch}
                </motion.span>
              ))}
            </motion.div>

            <motion.p
              className="font-accent text-[clamp(1rem,3vw,1.35rem)] uppercase tracking-[0.45em] text-gold-dark"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.55, ease: [0.16, 1, 0.3, 1] as const }}
            >
              Celebrations
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
