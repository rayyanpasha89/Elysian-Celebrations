"use client";

import { CustomCursor } from "@/components/shared/custom-cursor";

export default function MarketingTemplate({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CustomCursor />
      {children}
    </>
  );
}
