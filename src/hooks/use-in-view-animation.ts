"use client";

import { useRef } from "react";
import { useInView, type UseInViewOptions } from "framer-motion";

interface UseInViewAnimationOptions {
  threshold?: number;
  once?: boolean;
  margin?: string;
}

export function useInViewAnimation(options: UseInViewAnimationOptions = {}) {
  const { threshold = 0.1, once = true, margin = "0px" } = options;
  const ref = useRef<HTMLDivElement>(null);

  const inViewOptions: UseInViewOptions = {
    once,
    amount: threshold,
    margin: margin as UseInViewOptions["margin"],
  };

  const isInView = useInView(ref, inViewOptions);

  return { ref, isInView };
}
