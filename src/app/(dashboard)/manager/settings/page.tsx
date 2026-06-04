"use client";

import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "@/animations/variants";
import { dashCard, dashLabel } from "@/lib/dashboard-styles";
import { UserProfile } from "@clerk/nextjs";
import { TestAuthAccountNotice } from "@/components/testing/test-auth-account-notice";

export default function ManagerSettingsPage() {
  const testAuthEnabled =
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_ELYSIAN_TEST_AUTH_BYPASS === "1";

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div variants={fadeUp}>
        <p className={dashLabel}>Account</p>
        <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">Settings</h2>
      </motion.div>

      <motion.div variants={fadeUp} className="mt-10">
        <div className={dashCard}>
          {testAuthEnabled ? (
            <TestAuthAccountNotice />
          ) : (
            <UserProfile
              routing="hash"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  cardBox: "shadow-none border-0 w-full",
                  navbar: "hidden",
                },
              }}
            />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
