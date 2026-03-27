"use client";

import { CustomCursor } from "@/components/shared/custom-cursor";
import { LoadingScreen } from "@/components/shared/loading-screen";

export default function MarketingTemplate({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LoadingScreen />
      <CustomCursor />
      {children}
    </>
  );
}
