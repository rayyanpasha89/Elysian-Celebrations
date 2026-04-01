import { createAdminSupabaseClient } from "@/lib/supabase/server";

type AdminClient = ReturnType<typeof createAdminSupabaseClient>;

export async function getClientProfileId(
  supabase: AdminClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("client_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data.id;
}

export async function guestListBelongsToClient(
  supabase: AdminClient,
  guestListId: string,
  clientProfileId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("guest_lists")
    .select("id")
    .eq("id", guestListId)
    .eq("client_profile_id", clientProfileId)
    .maybeSingle();
  return !error && !!data;
}

export async function getGuestListIdsForClient(
  supabase: AdminClient,
  clientProfileId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("guest_lists")
    .select("id")
    .eq("client_profile_id", clientProfileId);
  if (error || !data) return [];
  return data.map((r) => r.id);
}
