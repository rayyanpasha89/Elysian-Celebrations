import { createAdminSupabaseClient } from "@/lib/supabase/server";

type WeddingContext = {
  supabase: ReturnType<typeof createAdminSupabaseClient>;
  profileId: string | null;
  wedding:
    | {
        id: string;
        name: string;
        date: string | null;
        status: string;
      }
    | null;
};

type ExistingEventRow = {
  id: string;
  date: string | null;
  wedding_day_id?: string | null;
};

type WeddingDayRow = {
  id: string;
  name: string;
  date: string | null;
  notes: string | null;
  sort_order: number;
};

function toDayKey(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function dayNameForIndex(index: number, count: number) {
  if (count === 1 && index === 0) return "Wedding Day";
  if (index === count - 1) return "Wedding Day";
  return `Day ${index + 1}`;
}

export async function getClientWeddingContext(
  userId: string
): Promise<WeddingContext> {
  const supabase = createAdminSupabaseClient();

  const { data: profile, error: profileError } = await supabase
    .from("client_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!profile?.id) {
    return { supabase, profileId: null, wedding: null };
  }

  const { data: wedding, error: weddingError } = await supabase
    .from("weddings")
    .select("id, name, date, status")
    .eq("client_profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (weddingError) {
    throw weddingError;
  }

  return {
    supabase,
    profileId: profile.id,
    wedding: wedding
      ? {
          id: wedding.id,
          name: wedding.name,
          date: wedding.date,
          status: wedding.status,
        }
      : null,
  };
}

export async function ensureWeddingDays(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  wedding: { id: string; date: string | null },
  events: ExistingEventRow[]
): Promise<WeddingDayRow[]> {
  const { data: existingDays, error: existingDaysError } = await supabase
    .from("wedding_days")
    .select("id, name, date, notes, sort_order")
    .eq("wedding_id", wedding.id)
    .order("sort_order", { ascending: true });

  if (existingDaysError) {
    throw existingDaysError;
  }

  if ((existingDays ?? []).length > 0) {
    const firstDayId = existingDays?.[0]?.id ?? null;
    const unassigned = events.filter((event) => !event.wedding_day_id);
    if (firstDayId && unassigned.length > 0) {
      await Promise.all(
        unassigned.map((event) =>
          supabase
            .from("wedding_events")
            .update({ wedding_day_id: firstDayId })
            .eq("id", event.id)
        )
      );
    }

    return existingDays ?? [];
  }

  const distinctKeys = new Set<string>();
  for (const event of events) {
    const key = toDayKey(event.date);
    if (key) distinctKeys.add(key);
  }

  const weddingDayKey = toDayKey(wedding.date);
  if (weddingDayKey) {
    distinctKeys.add(weddingDayKey);
  }

  if (distinctKeys.size === 0) {
    const today = new Date();
    today.setUTCHours(12, 0, 0, 0);
    distinctKeys.add(today.toISOString().slice(0, 10));
  }

  const orderedKeys = [...distinctKeys].sort();
  const daysToInsert = orderedKeys.map((key, index) => ({
    wedding_id: wedding.id,
    name: dayNameForIndex(index, orderedKeys.length),
    date: `${key}T12:00:00.000Z`,
    sort_order: index,
  }));

  const { data: createdDays, error: createdDaysError } = await supabase
    .from("wedding_days")
    .insert(daysToInsert)
    .select("id, name, date, notes, sort_order")
    .order("sort_order", { ascending: true });

  if (createdDaysError || !createdDays) {
    throw createdDaysError ?? new Error("Failed to create wedding days");
  }

  const dayIdByKey = new Map<string, string>();
  for (const day of createdDays) {
    const key = toDayKey(day.date);
    if (key) {
      dayIdByKey.set(key, day.id);
    }
  }

  const fallbackDayId = createdDays[0]?.id ?? null;
  const updates = events
    .map((event) => {
      const dayId =
        dayIdByKey.get(toDayKey(event.date) ?? "") ?? fallbackDayId;
      if (!dayId) return null;

      return supabase
        .from("wedding_events")
        .update({ wedding_day_id: dayId })
        .eq("id", event.id);
    })
    .filter(Boolean);

  if (updates.length > 0) {
    await Promise.all(updates);
  }

  return createdDays;
}
