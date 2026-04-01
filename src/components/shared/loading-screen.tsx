"use client";

import {
  startTransition,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { AnimatePresence, motion } from "framer-motion";

const STORAGE_KEY = "elysian-loading-screen-done";

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
    () => () => {},
    () => true,
    () => false
  );
  const [show, setShow] = useState(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!mounted) return;
    try {
      if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(STORAGE_KEY)) {
        onCompleteRef.current?.();
        return;
      }
    } catch {
      onCompleteRef.current?.();
      return;
    }
    startTransition(() => setShow(true));
  }, [mounted]);

  useEffect(() => {
    if (!show) return;
    const id = window.setTimeout(() => {
      setShow(false);
    }, 2000);
    return () => window.clearTimeout(id);
  }, [show]);

  if (!mounted) return null;

  return (
    <AnimatePresence
      onExitComplete={() => {
        try {
          if (typeof sessionStorage !== "undefined") {
            sessionStorage.setItem(STORAGE_KEY, "1");
          }
        } catch {
          // sessionStorage blocked — ignore
        }
        onCompleteRef.current?.();
      }}
    >
      {show && (
        <motion.div
          key="loading-screen"
          className="pointer-events-none fixed inset-0 z-[9990] flex flex-col items-center justify-center bg-ivory"
          initial={{ y: 0 }}
          exit={{ y: "-100%" }}
          transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] as const }}
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
