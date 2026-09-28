import "dotenv/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseSecretKey, getSupabaseUrl } from "../src/lib/supabase/env";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function countRows(
  supabase: SupabaseClient,
  table: string,
  column: string,
  value: string
) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(column, value);
  if (error) throw new Error(`Counting ${table}: ${error.message}`);
  return count ?? 0;
}

async function main() {
  const supabase = createClient(getSupabaseUrl(), getSupabaseSecretKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: clientUser, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("email", "testing+reeva-vansh@elysiancelebrations.app")
    .single();
  if (userError) throw new Error(`Loading Reeva & Vansh user: ${userError.message}`);

  const { data: clientProfile, error: profileError } = await supabase
    .from("client_profiles")
    .select("id")
    .eq("user_id", clientUser.id)
    .single();
  if (profileError) throw new Error(`Loading Reeva & Vansh profile: ${profileError.message}`);

  const { data: wedding, error: weddingError } = await supabase
    .from("weddings")
    .select("id, name")
    .eq("client_profile_id", clientProfile.id)
    .eq("name", "Reeva & Vansh at Gateway Bekal")
    .single();
  if (weddingError) throw new Error(`Loading Reeva & Vansh event: ${weddingError.message}`);

  const { data: dayRows, error: dayError } = await supabase
    .from("wedding_days")
    .select("id")
    .eq("wedding_id", wedding.id);
  if (dayError) throw new Error(`Loading event days: ${dayError.message}`);

  const { data: eventRows, error: eventError } = await supabase
    .from("wedding_events")
    .select("id")
    .eq("wedding_id", wedding.id);
  if (eventError) throw new Error(`Loading functions: ${eventError.message}`);

  const eventIds = (eventRows ?? []).map((row) => row.id);
  const bookingCount = await countRows(
    supabase,
    "bookings",
    "client_profile_id",
    clientProfile.id
  );
  const requirementCount = eventIds.length
    ? await supabase
        .from("wedding_event_requirements")
        .select("id", { count: "exact", head: true })
        .in("wedding_event_id", eventIds)
        .then(({ count, error }) => {
          if (error) throw new Error(`Counting requirements: ${error.message}`);
          return count ?? 0;
        })
    : 0;

  const expectedEventRows = [
    ["event_staff_assignments", 1],
    ["event_operations_departments", 3],
    ["event_operations_zones", 3],
    ["event_operations_items", 3],
    ["event_crew_shifts", 1],
    ["event_operations_briefings", 1],
    ["event_production_records", 4],
    ["event_partner_travel_parties", 1],
    ["event_guest_communication_campaigns", 1],
  ] as const;

  assert(dayRows?.length === 3, `Expected 3 days, found ${dayRows?.length ?? 0}`);
  assert(eventRows?.length === 9, `Expected 9 functions, found ${eventRows?.length ?? 0}`);
  assert(bookingCount === 7, `Expected 7 bookings, found ${bookingCount}`);
  assert(requirementCount === 54, `Expected 54 requirements, found ${requirementCount}`);

  const verifiedCounts: Array<[string, number]> = [];
  for (const [table, minimum] of expectedEventRows) {
    const count = await countRows(supabase, table, "wedding_id", wedding.id);
    assert(count >= minimum, `Expected at least ${minimum} ${table} rows, found ${count}`);
    verifiedCounts.push([table, count]);
  }

  console.log("Evara Reeva & Vansh demo verification passed.");
  console.log(`- Event: ${wedding.name}`);
  console.log(`- Days: ${dayRows.length}`);
  console.log(`- Functions: ${eventRows.length}`);
  console.log(`- Requirements: ${requirementCount}`);
  console.log(`- Bookings: ${bookingCount}`);
  for (const [table, count] of verifiedCounts) console.log(`- ${table}: ${count}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`Evara demo verification failed: ${message}`);
  process.exitCode = 1;
});
