import type { Transition } from "framer-motion";

// Expo ease out — the signature Elysian easing
export const easeOutExpo: Transition = {
  duration: 0.8,
  ease: [0.16, 1, 0.3, 1],
};

export const easeOutQuart: Transition = {
  duration: 0.6,
  ease: [0.25, 1, 0.5, 1],
};

export const spring: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
};

export const springGentle: Transition = {
  type: "spring",
  stiffness: 200,
  damping: 25,
};

export const springBouncy: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 15,
};

export const slow: Transition = {
  duration: 1.2,
  ease: [0.16, 1, 0.3, 1],
};

export const fast: Transition = {
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1],
};
