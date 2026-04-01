"use client";

import { useEffect, useRef } from "react";
import { useIsMobile } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

type CursorMode = "default" | "pointer" | "text";

export function CustomCursor() {
  const isMobile = useIsMobile();
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const mode = useRef<CursorMode>("default");
  const raf = useRef<number>(0);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isMobile) return;

    document.body.style.cursor = "none";

    const onMove = (e: MouseEvent) => {
      target.current = { x: e.clientX, y: e.clientY };
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const host = el?.closest("[data-cursor]");
      const v = host?.getAttribute("data-cursor");
      if (v === "pointer" || v === "text") mode.current = v;
      else mode.current = "default";
    };

    const onLeave = () => {
      mode.current = "default";
    };

    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);

    const tick = () => {
      current.current.x = lerp(current.current.x, target.current.x, 0.18);
      current.current.y = lerp(current.current.y, target.current.y, 0.18);

      const el = ringRef.current;
      if (el) {
        el.style.left = `${current.current.x}px`;
        el.style.top = `${current.current.y}px`;
        const inner = el.firstElementChild as HTMLElement | null;
        if (inner) {
          inner.className = cn(
            "pointer-events-none transition-[width,height,background-color,border-radius] duration-200 ease-out",
            mode.current === "default" &&
              "h-5 w-5 rounded-full border-2 border-[color:var(--gold-primary)] bg-transparent",
            mode.current === "pointer" &&
              "h-[50px] w-[50px] rounded-full border-2 border-[color:var(--gold-primary)] bg-[color:rgba(201,169,110,0.22)]",
            mode.current === "text" &&
              "h-7 w-0.5 rounded-sm bg-[color:var(--gold-primary)]",
          );
        }
      }

      raf.current = requestAnimationFrame(tick);
    };

    raf.current = requestAnimationFrame(tick);

    return () => {
      document.body.style.cursor = "";
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf.current);
    };
  }, [isMobile]);

  if (isMobile) return null;

  return (
    <div
      ref={ringRef}
      className="pointer-events-none fixed left-0 top-0 z-[10040] -translate-x-1/2 -translate-y-1/2 will-change-transform"
      aria-hidden
    >
      <div
        className={cn(
          "pointer-events-none h-5 w-5 rounded-full border-2 border-[color:var(--gold-primary)] bg-transparent transition-[width,height,background-color,border-radius] duration-200 ease-out",
        )}
      />
    </div>
  );
}
