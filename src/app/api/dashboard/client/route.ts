import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  getAuthSession,
  requireRole,
  apiError,
  apiSuccess,
} from "@/lib/api-utils";

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

function daysUntil(dateIso: string | null | undefined): number {
  if (!dateIso) return 0;
  const t = new Date(dateIso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(
    0,
    Math.ceil((t - Date.now()) / (1000 * 60 * 60 * 24))
  );
}

export async function GET() {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "client");
  if (roleCheck) return roleCheck;

  try {
    const supabase = createAdminSupabaseClient();

    const { data: profile, error: pErr } = await supabase
      .from("client_profiles")
      .select("id, partner_name, wedding_date, estimated_budget")
      .eq("user_id", session.userId)
      .maybeSingle();

    if (pErr) {
      console.error("client_profiles:", pErr);
      return apiError("Failed to load profile", 500);
    }

    if (!profile) {
      return apiSuccess({
        wedding: null,
        stats: {
          daysUntil: 0,
          budgetPercent: 0,
          vendorsBooked: 0,
          guestsConfirmed: 0,
        },
        tasks: [],
        recentNotifications: [],
        needsOnboarding: true,
        needsProfile: true,
      });
    }

    const [
      { data: wedding },
      { data: distinctVendors },
      { data: lists },
      { data: budgetRow },
      { data: notifs },
    ] = await Promise.all([
      supabase
        .from("weddings")
        .select("id, name, date, status, destination:destinations(name)")
        .eq("client_profile_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("bookings")
        .select("vendor_profile_id")
        .eq("client_profile_id", profile.id)
        .in("status", ["CONFIRMED", "DEPOSIT_PAID", "COMPLETED"]),
      supabase
        .from("guest_lists")
        .select("id")
        .eq("client_profile_id", profile.id),
      supabase
        .from("budgets")
        .select("id, total_budget")
        .eq("client_profile_id", profile.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("notifications")
        .select("id, title, message, created_at")
        .eq("user_id", session.userId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const weddingDate =
      wedding?.date ?? profile.wedding_date ?? null;

    const vendorsBooked = new Set(
      (distinctVendors ?? []).map((r) => r.vendor_profile_id)
    ).size;

    const listIds = (lists ?? []).map((l) => l.id);
    const [
      { count: guestsCount },
      { data: budgetCategories },
      { data: timelineItems },
    ] = await Promise.all([
      listIds.length
        ? supabase
            .from("guests")
            .select("id", { count: "exact", head: true })
            .in("guest_list_id", listIds)
            .eq("rsvp_status", "CONFIRMED")
        : Promise.resolve({ count: 0, data: null, error: null }),
      budgetRow?.id
        ? supabase
            .from("budget_categories")
            .select("id")
            .eq("budget_id", budgetRow.id)
        : Promise.resolve({ data: [], error: null }),
      wedding?.id
        ? supabase
            .from("timeline_items")
            .select("id, title, due_date, is_completed")
            .eq("wedding_id", wedding.id)
            .eq("is_completed", false)
            .order("due_date", { ascending: true, nullsFirst: false })
            .limit(5)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const guestsConfirmed = guestsCount ?? 0;
    const catIds = (budgetCategories ?? []).map((c) => c.id);
    let budgetPercent = 0;
    if (budgetRow?.id && budgetRow.total_budget > 0 && catIds.length) {
      const { data: items } = await supabase
        .from("budget_items")
        .select("estimated_cost, quantity")
        .in("budget_category_id", catIds);
      const spent = (items ?? []).reduce(
        (s, i) => s + i.estimated_cost * (i.quantity ?? 1),
        0
      );
      budgetPercent = Math.min(
        100,
        Math.round((spent / budgetRow.total_budget) * 100)
      );
    }

    const tasks = (timelineItems ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      due: t.due_date
        ? new Date(t.due_date).toLocaleDateString("en-IN", {
            month: "short",
            day: "numeric",
          })
        : "—",
      done: t.is_completed,
    }));

    const recentNotifications = (notifs ?? []).map((n) => ({
      id: n.id,
      text: `${n.title}: ${n.message}`,
      time: formatRelativeTime(n.created_at),
    }));

    const dest = wedding?.destination as { name?: string } | null;
    const needsOnboarding = !wedding;

    return apiSuccess({
      wedding: wedding
        ? {
            id: wedding.id,
            name: wedding.name,
            date: wedding.date,
            destinationName: dest?.name ?? null,
            status: wedding.status,
          }
        : null,
      stats: {
        daysUntil: daysUntil(weddingDate),
        budgetPercent,
        vendorsBooked,
        guestsConfirmed,
      },
      tasks,
      recentNotifications,
      needsOnboarding,
      needsProfile: false,
      subtitle: wedding
        ? `${dest?.name ?? "Your destination"} wedding — ${daysUntil(weddingDate)} days to go.`
        : "Set up your wedding to unlock planning tools.",
    });
  } catch (e) {
    console.error("dashboard client", e);
    return apiError("Internal server error", 500);
  }
}
