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
    .select("id, role, is_active, is_test_fixture")
    .eq("email", "rayyanh799@gmail.com")
    .single();
  if (userError) throw new Error(`Loading Reeva & Vansh user: ${userError.message}`);
  assert(clientUser.role === "CLIENT", `Expected CLIENT role, found ${clientUser.role}`);
  assert(clientUser.is_active, "Expected the Reeva & Vansh identity to be active");
  assert(
    clientUser.is_test_fixture,
    "Expected the Gmail presentation identity to be an approved demo fixture"
  );

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
    .select("id, name, wedding_day_id, estimated_budget")
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
  assert(
    eventRows.every((event) => event.wedding_day_id),
    "Every Reeva & Vansh function must belong to an event day"
  );
  const functionsPerDay = new Map<string, number>();
  for (const event of eventRows) {
    const dayId = event.wedding_day_id as string;
    functionsPerDay.set(dayId, (functionsPerDay.get(dayId) ?? 0) + 1);
  }
  assert(functionsPerDay.size === 3, `Expected functions across 3 days, found ${functionsPerDay.size}`);
  assert(
    [...functionsPerDay.values()].every((count) => count === 3),
    `Expected 3 functions per day, found ${[...functionsPerDay.values()].join(", ")}`
  );
  assert(bookingCount === 7, `Expected 7 bookings, found ${bookingCount}`);
  assert(requirementCount === 54, `Expected 54 requirements, found ${requirementCount}`);
  const pricedFunctions = (eventRows ?? []).filter(
    (event) => (event.estimated_budget ?? 0) > 0
  );
  assert(
    pricedFunctions.length === 3,
    `Expected 3 priced functions, found ${pricedFunctions.length}`
  );
  assert(
    pricedFunctions.reduce(
      (total, event) => total + (event.estimated_budget ?? 0),
      0
    ) === 10_954_888,
    "Expected priced functions to total the published Elysian client amount"
  );

  const { data: retiredUser, error: retiredUserError } = await supabase
    .from("users")
    .select("id, is_active")
    .eq("email", "testing+clerk_test_reeva-vansh@elysiancelebrations.app")
    .maybeSingle();
  if (retiredUserError) {
    throw new Error(`Loading retired Reeva fixture: ${retiredUserError.message}`);
  }
  if (retiredUser) {
    assert(!retiredUser.is_active, "Expected the retired Reeva fixture to be inactive");
    const retiredProfileCount = await supabase
      .from("client_profiles")
      .select("id", { count: "exact", head: true })
      .eq("user_id", retiredUser.id)
      .then(({ count, error }) => {
        if (error) throw new Error(`Checking retired profile: ${error.message}`);
        return count ?? 0;
      });
    assert(retiredProfileCount === 0, "Retired Reeva fixture still owns a client profile");
  }

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
  console.log(`- Priced functions: ${pricedFunctions.length}`);
  console.log("- Login owner: rayyanh799@gmail.com (CLIENT, active)");
  for (const [table, count] of verifiedCounts) console.log(`- ${table}: ${count}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`Evara demo verification failed: ${message}`);
  process.exitCode = 1;
});
