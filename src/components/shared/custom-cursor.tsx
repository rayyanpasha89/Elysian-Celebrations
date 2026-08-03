"use client";

import { useEffect, useRef } from "react";
import { useIsMobile, usePrefersReducedMotion } from "@/hooks/use-media-query";

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

type CursorMode = "default" | "pointer" | "text";

const CURSOR_BASE_CLASS =
  "pointer-events-none transition-[width,height,background-color,border-radius] duration-200 ease-out";

const CURSOR_MODE_CLASS: Record<CursorMode, string> = {
  default:
    "h-5 w-5 rounded-full border-2 border-[color:var(--gold-primary)] bg-transparent",
  pointer:
    "h-[50px] w-[50px] rounded-full border-2 border-gold-primary bg-gold-primary/20",
  text: "h-7 w-0.5 rounded-sm border-0 bg-[color:var(--gold-primary)]",
};

const SETTLED_DISTANCE = 0.1;

export function CustomCursor() {
  const isMobile = useIsMobile();
  const prefersReducedMotion = usePrefersReducedMotion();
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const mode = useRef<CursorMode>("default");
  const raf = useRef<number>(0);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isMobile || prefersReducedMotion) return;

    const ring = ringRef.current;
    const inner = ring?.firstElementChild as HTMLElement | null;
    if (!ring || !inner) return;

    const previousCursor = document.body.style.cursor;
    let hasPosition = false;

    document.body.style.cursor = "none";

    const setMode = (nextMode: CursorMode) => {
      if (mode.current === nextMode) return;
      mode.current = nextMode;
      inner.className = `${CURSOR_BASE_CLASS} ${CURSOR_MODE_CLASS[nextMode]}`;
    };

    const tick = () => {
      const deltaX = target.current.x - current.current.x;
      const deltaY = target.current.y - current.current.y;
      const settled =
        Math.abs(deltaX) < SETTLED_DISTANCE && Math.abs(deltaY) < SETTLED_DISTANCE;

      current.current.x = settled
        ? target.current.x
        : lerp(current.current.x, target.current.x, 0.18);
      current.current.y = settled
        ? target.current.y
        : lerp(current.current.y, target.current.y, 0.18);

      ring.style.transform = `translate3d(${current.current.x}px, ${current.current.y}px, 0) translate(-50%, -50%)`;

      if (settled) {
        raf.current = 0;
        return;
      }

      raf.current = requestAnimationFrame(tick);
    };

    const scheduleTick = () => {
      if (raf.current === 0) raf.current = requestAnimationFrame(tick);
    };

    const onMove = (event: PointerEvent) => {
      target.current = { x: event.clientX, y: event.clientY };
      if (!hasPosition) {
        current.current = { ...target.current };
        hasPosition = true;
      }

      const eventTarget = event.target instanceof Element ? event.target : null;
      const host = eventTarget?.closest("[data-cursor]");
      const v = host?.getAttribute("data-cursor");
      setMode(v === "pointer" || v === "text" ? v : "default");

      ring.style.opacity = "1";
      scheduleTick();
    };

    const onLeave = () => {
      setMode("default");
      ring.style.opacity = "0";
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);

    return () => {
      document.body.style.cursor = previousCursor;
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      if (raf.current !== 0) cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
  }, [isMobile, prefersReducedMotion]);

  if (isMobile || prefersReducedMotion) return null;

  return (
    <div
      ref={ringRef}
      className="pointer-events-none fixed left-0 top-0 z-[10040] opacity-0 transition-opacity duration-150 will-change-transform"
      style={{ transform: "translate3d(0, 0, 0) translate(-50%, -50%)" }}
      aria-hidden
    >
      <div className={`${CURSOR_BASE_CLASS} ${CURSOR_MODE_CLASS.default}`} />
    </div>
  );
}
