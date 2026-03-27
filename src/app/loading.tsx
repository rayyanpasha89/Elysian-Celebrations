"use client";

import { motion } from "framer-motion";

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center bg-ivory px-6 py-24">
      <div className="h-[2px] w-48 overflow-hidden bg-charcoal/10">
        <motion.div
          className="h-full w-1/3 bg-gold-primary"
          animate={{ x: ["-100%", "400%"] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}
