"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "@/animations/variants";
import { dashCard, dashLabel } from "@/lib/dashboard-styles";

export default function AdminSettingsPage() {
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-10">
      <motion.div variants={fadeUp}>
        <p className={dashLabel}>System</p>
        <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">Settings</h2>
      </motion.div>

      <motion.section variants={fadeUp} className={dashCard}>
        <h3 className="font-display text-lg text-charcoal">Platform configuration</h3>
        <p className="font-heading mt-3 text-sm leading-relaxed text-slate">
          Brand name, contact email, and commission rates are not stored in the application database. They are
          typically set via your deployment environment, CMS, or operations runbook. This screen exists so admins
          know where limits are—there is no hidden save here.
        </p>
        <p className="font-heading mt-4 text-sm leading-relaxed text-slate">
          To change which destinations appear on marketing surfaces, use the destinations catalogue: visibility
          is controlled per destination (active / inactive), not from this page.
        </p>
        <div className="mt-8 border border-charcoal/10 bg-cream/40 px-4 py-3">
          <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-slate">Next step</p>
          <Link
            href="/admin/destinations"
            className="mt-2 inline-block font-heading text-sm text-gold-primary underline-offset-4 hover:underline"
          >
            Manage destinations
          </Link>
        </div>
      </motion.section>

      <motion.section variants={fadeUp} className={dashCard}>
        <h3 className="font-display text-lg text-charcoal">Featured &amp; discovery</h3>
        <p className="font-heading mt-3 text-sm leading-relaxed text-slate">
          Homepage and discovery modules read from the live <strong className="font-medium text-charcoal">destinations</strong>{" "}
          catalogue. There is no separate &quot;featured&quot; list in the database—use sort order and active flags
          in the destinations admin to control what surfaces where.
        </p>
      </motion.section>
    </motion.div>
  );
}
