import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { config } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database.types";

config({ path: resolve(process.cwd(), ".env.local"), quiet: true });
config({ path: resolve(process.cwd(), ".env"), quiet: true });

type Role = "client" | "vendor" | "manager" | "admin";
type JsonRecord = Record<string, unknown>;
type TestSupabase = SupabaseClient<Database>;

type Fixture = {
  runId: string;
  requestAddress: string;
  userIds: Record<Role, string>;
  emails: Record<Role, string>;
  vendorSlug: string;
  vendorName: string;
  vendorProfileId: string | null;
  vendorServiceId: string | null;
  freshVendorServiceId: string | null;
  weddingId: string | null;
  dayId: string | null;
  eventId: string | null;
  bookingId: string | null;
  invoiceId: string | null;
};

type ServerHandle = {
  child: ChildProcess;
  baseUrl: string;
  logs: () => string;
};

type RequestOptions = {
  method?: string;
  body?: unknown;
  expectedStatus?: number;
  headers?: Record<string, string>;
};

const TEST_COOKIE = "ec_test_role";
const SERVER_START_TIMEOUT_MS = 120_000;
const SERVER_STOP_TIMEOUT_MS = 8_000;
const PORTAL_ROUTE_MATRIX = {
  client: [
    "/client",
    "/client/wedding",
    "/client/budget",
    "/client/vendors",
    "/client/guests",
    "/client/timeline",
    "/client/mood-board",
    "/client/messages",
    "/client/bookings",
    "/client/billing",
    "/client/settings",
  ],
  vendor: [
    "/vendor",
    "/vendor/analytics",
    "/vendor/profile",
    "/vendor/services",
    "/vendor/portfolio",
    "/vendor/reviews",
    "/vendor/inquiries",
    "/vendor/bookings",
    "/vendor/calendar",
    "/vendor/messages",
    "/vendor/settings",
  ],
  manager: [
    "/manager/operations",
    "/manager/messages",
    "/manager/settings",
  ],
  admin: [
    "/admin",
    "/admin/team",
    "/admin/analytics",
    "/admin/pricing",
    "/admin/billing",
    "/admin/progress",
    "/admin/revenue",
    "/admin/vendors",
    "/admin/clients",
    "/admin/destinations",
    "/admin/packages",
    "/admin/venues",
    "/admin/blog",
    "/admin/testimonials",
    "/admin/inquiries",
    "/admin/users",
    "/admin/settings",
  ],
} as const satisfies Record<Role, readonly string[]>;
const inspectionHoldMs = Math.max(
  0,
  Number(process.env.ELYSIAN_JOURNEY_INSPECTION_HOLD_MS) || 0
);

function requiredEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  throw new Error(`Missing required environment variable: ${names.join(" or ")}`);
}

function createTestSupabase() {
  return createClient<Database>(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    }
  );
}

function makeFixture(): Fixture {
  const runId = randomUUID().replaceAll("-", "").slice(0, 16);
  const userIds = {
    client: `journey_client_${runId}`,
    vendor: `journey_vendor_${runId}`,
    manager: `journey_manager_${runId}`,
    admin: `journey_admin_${runId}`,
  } satisfies Record<Role, string>;
  const emails = Object.fromEntries(
    (Object.keys(userIds) as Role[]).map((role) => [
      role,
      `testing+journey-${runId}-${role}@elysiancelebrations.app`,
    ])
  ) as Record<Role, string>;

  return {
    runId,
    requestAddress: `2001:db8::${runId.slice(0, 4)}:${runId.slice(4, 8)}`,
    userIds,
    emails,
    vendorSlug: `journey-atelier-${runId}`,
    vendorName: `Journey Atelier ${runId}`,
    vendorProfileId: null,
    vendorServiceId: null,
    freshVendorServiceId: null,
    weddingId: null,
    dayId: null,
    eventId: null,
    bookingId: null,
    invoiceId: null,
  };
}

function asRecord(value: unknown, label: string): JsonRecord {
  assert.ok(
    value && typeof value === "object" && !Array.isArray(value),
    `${label} must be an object`
  );
  return value as JsonRecord;
}

function asArray(value: unknown, label: string): unknown[] {
  assert.ok(Array.isArray(value), `${label} must be an array`);
  return value;
}

function hasKeyDeep(value: unknown, key: string): boolean {
  if (Array.isArray(value)) return value.some((entry) => hasKeyDeep(entry, key));
  if (!value || typeof value !== "object") return false;
  const record = value as JsonRecord;
  if (Object.hasOwn(record, key)) return true;
  return Object.values(record).some((entry) => hasKeyDeep(entry, key));
}

function responsePreview(value: unknown) {
  if (typeof value === "string") return value.slice(0, 600);
  try {
    return JSON.stringify(value).slice(0, 600);
  } catch {
    return String(value).slice(0, 600);
  }
}

function findPricingBooking(payload: unknown, bookingId: string) {
  const clients = asArray(asRecord(payload, "pricing payload").clients, "pricing clients");
  for (const clientValue of clients) {
    const client = asRecord(clientValue, "pricing client");
    for (const dayValue of asArray(client.days, "pricing days")) {
      const day = asRecord(dayValue, "pricing day");
      for (const eventValue of asArray(day.events, "pricing events")) {
        const event = asRecord(eventValue, "pricing event");
        for (const bookingValue of asArray(event.bookings, "pricing bookings")) {
          const booking = asRecord(bookingValue, "pricing booking");
          if (booking.id === bookingId) return { client, booking };
        }
      }
    }
  }
  return null;
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function availablePort() {
  return new Promise<number>((resolvePort, reject) => {
    const server = createServer();
    server.unref();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not reserve a local test port"));
        return;
      }
      const { port } = address;
      server.close((error) => (error ? reject(error) : resolvePort(port)));
    });
  });
}

async function startDevelopmentServer(fixture: Fixture): Promise<ServerHandle> {
  const port = await availablePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const nextBin = resolve(process.cwd(), "node_modules/next/dist/bin/next");
  const child = spawn(
    process.execPath,
    [nextBin, "dev", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ELYSIAN_TEST_AUTH_BYPASS: "1",
        NEXT_PUBLIC_ELYSIAN_TEST_AUTH_BYPASS: "1",
        ELYSIAN_TEST_AUTH_DEFAULT_ROLE: "client",
        ELYSIAN_TEST_AUTH_CLIENT_USER_ID: fixture.userIds.client,
        ELYSIAN_TEST_AUTH_VENDOR_USER_ID: fixture.userIds.vendor,
        ELYSIAN_TEST_AUTH_MANAGER_USER_ID: fixture.userIds.manager,
        ELYSIAN_TEST_AUTH_ADMIN_USER_ID: fixture.userIds.admin,
      },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  let output = "";
  const collect = (chunk: Buffer | string) => {
    output = `${output}${chunk.toString()}`.slice(-24_000);
  };
  child.stdout?.on("data", collect);
  child.stderr?.on("data", collect);

  const deadline = Date.now() + SERVER_START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(
        `Next development server exited with ${child.exitCode}.\n${output}`
      );
    }
    try {
      const response = await fetch(baseUrl, { redirect: "manual" });
      if (response.status >= 200 && response.status < 500) {
        await response.body?.cancel();
        return { child, baseUrl, logs: () => output };
      }
    } catch {
      // Compilation and the first listener bind can take a few seconds.
    }
    await sleep(500);
  }

  child.kill("SIGTERM");
  throw new Error(`Next development server did not become ready.\n${output}`);
}

async function stopDevelopmentServer(server: ServerHandle | null) {
  if (!server || server.child.exitCode !== null) return;
  server.child.kill("SIGTERM");

  await Promise.race([
    new Promise<void>((resolveExit) => server.child.once("exit", () => resolveExit())),
    sleep(SERVER_STOP_TIMEOUT_MS).then(() => {
      if (server.child.exitCode === null) server.child.kill("SIGKILL");
    }),
  ]);
}

async function seedFixture(supabase: TestSupabase, fixture: Fixture) {
  const users: Database["public"]["Tables"]["users"]["Insert"][] = (
    Object.keys(fixture.userIds) as Role[]
  ).map((role) => ({
    id: fixture.userIds[role],
    email: fixture.emails[role],
    name: `Authenticated Journey ${role}`,
    role: role.toUpperCase() as Database["public"]["Enums"]["user_role"],
    is_active: true,
  }));
  const { error: userError } = await supabase.from("users").insert(users);
  if (userError) throw new Error(`Creating journey identities: ${userError.message}`);

  const { data: preferredCategory, error: preferredCategoryError } = await supabase
    .from("vendor_categories")
    .select("id")
    .eq("slug", "planning")
    .maybeSingle();
  if (preferredCategoryError) {
    throw new Error(`Loading vendor category: ${preferredCategoryError.message}`);
  }

  let categoryId = preferredCategory?.id ?? null;
  if (!categoryId) {
    const { data: fallbackCategory, error: fallbackCategoryError } = await supabase
      .from("vendor_categories")
      .select("id")
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (fallbackCategoryError) {
      throw new Error(`Loading fallback vendor category: ${fallbackCategoryError.message}`);
    }
    categoryId = fallbackCategory?.id ?? null;
  }
  if (!categoryId) {
    throw new Error("At least one vendor category is required for journey testing");
  }

  const { data: vendorProfile, error: vendorProfileError } = await supabase
    .from("vendor_profiles")
    .insert({
      user_id: fixture.userIds.vendor,
      business_name: fixture.vendorName,
      slug: fixture.vendorSlug,
      category_id: categoryId,
      description: "Clearly isolated vendor fixture for authenticated journey testing.",
      short_bio: "Test-only event operations studio.",
      city: "Test City",
      state: "Test State",
      experience: 5,
      is_verified: true,
      accepting_inquiries: true,
    })
    .select("id")
    .single();
  if (vendorProfileError || !vendorProfile) {
    throw new Error(
      `Creating journey vendor profile: ${vendorProfileError?.message ?? "no row returned"}`
    );
  }
  fixture.vendorProfileId = vendorProfile.id;

  const { data: service, error: serviceError } = await supabase
    .from("vendor_services")
    .insert({
      vendor_profile_id: vendorProfile.id,
      name: "Authenticated Journey Coordination",
      description: "A test-only service used to verify discovery through billing.",
      service_scope: "One function with planning, coordination, and run-of-show support.",
      base_price: 125_000,
      max_price: 190_000,
      unit: "event",
      event_type_fit: ["corporate", "conference"],
      inclusions: ["Planning lead", "Run-of-show"],
      deliverables: ["Final operations brief"],
      add_ons: ["Guest desk"],
      is_active: true,
    })
    .select("id")
    .single();
  if (serviceError || !service) {
    throw new Error(
      `Creating journey vendor service: ${serviceError?.message ?? "no row returned"}`
    );
  }
  fixture.vendorServiceId = service.id;

  const { data: freshService, error: freshServiceError } = await supabase
    .from("vendor_services")
    .insert({
      vendor_profile_id: vendorProfile.id,
      name: "Authenticated Journey Production Desk",
      description: "A second test-only service used to prove first-time booking inserts.",
      service_scope: "A production desk for one event function.",
      base_price: 75_000,
      max_price: 110_000,
      unit: "event",
      event_type_fit: ["corporate", "conference"],
      inclusions: ["Production lead"],
      deliverables: ["Production cue sheet"],
      add_ons: ["Speaker ready room"],
      is_active: true,
    })
    .select("id")
    .single();
  if (freshServiceError || !freshService) {
    throw new Error(
      `Creating fresh-booking vendor service: ${freshServiceError?.message ?? "no row returned"}`
    );
  }
  fixture.freshVendorServiceId = freshService.id;
}

async function cleanupFixture(supabase: TestSupabase, fixture: Fixture) {
  const failures: string[] = [];
  const recordFailure = (label: string, message: string) => {
    failures.push(`${label}: ${message}`);
  };

  let bookingIds: string[] = fixture.bookingId ? [fixture.bookingId] : [];
  const { data: clientProfile, error: clientProfileError } = await supabase
    .from("client_profiles")
    .select("id")
    .eq("user_id", fixture.userIds.client)
    .maybeSingle();
  if (clientProfileError) {
    recordFailure("load client profile", clientProfileError.message);
  } else if (clientProfile?.id) {
    const { data: bookings, error: bookingError } = await supabase
      .from("bookings")
      .select("id")
      .eq("client_profile_id", clientProfile.id);
    if (bookingError) {
      recordFailure("load test bookings", bookingError.message);
    } else {
      bookingIds = [...new Set([...(bookings ?? []).map((row) => row.id), ...bookingIds])];
    }
  }

  if (bookingIds.length > 0) {
    const { error } = await supabase.rpc("purge_test_booking_financials", {
      p_booking_ids: bookingIds,
      p_actor_user_id: fixture.userIds.admin,
    });
    if (error) recordFailure("purge test financials", error.message);
  }

  const actorIds = Object.values(fixture.userIds);
  const rateLimitHashes = [
    sha256(`vendor-catalogue-read:ip:${fixture.requestAddress}`),
    sha256(`message-send:${fixture.userIds.client}`),
    sha256(`message-send:${fixture.userIds.vendor}`),
    sha256(`operations-feed-create:${fixture.userIds.manager}`),
    sha256(`billing-invoice-issue:${fixture.userIds.admin}`),
  ];
  const cleanupActions: [string, PromiseLike<{ error: { message: string } | null }>][] = [
    [
      "delete journey audit rows",
      supabase.from("admin_audit_log").delete().in("actor_user_id", actorIds),
    ],
    [
      "delete journey rate-limit rows",
      supabase.from("api_rate_limits").delete().in("key_hash", rateLimitHashes),
    ],
    [
      "delete journey client profile",
      supabase.from("client_profiles").delete().eq("user_id", fixture.userIds.client),
    ],
    [
      "delete journey vendor profile",
      supabase.from("vendor_profiles").delete().eq("user_id", fixture.userIds.vendor),
    ],
  ];

  for (const [label, action] of cleanupActions) {
    const { error } = await action;
    if (error) recordFailure(label, error.message);
  }

  const { error: userDeleteError } = await supabase
    .from("users")
    .delete()
    .in("id", actorIds);
  if (userDeleteError) recordFailure("delete journey identities", userDeleteError.message);

  const { count: remainingUsers, error: userVerifyError } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .in("id", actorIds);
  if (userVerifyError) {
    recordFailure("verify journey cleanup", userVerifyError.message);
  } else if ((remainingUsers ?? 0) !== 0) {
    recordFailure("verify journey cleanup", `${remainingUsers} test identities remain`);
  }

  if (bookingIds.length > 0) {
    const [invoiceCheck, paymentCheck] = await Promise.all([
      supabase
        .from("billing_invoices")
        .select("id", { count: "exact", head: true })
        .in("booking_id", bookingIds),
      supabase
        .from("payments")
        .select("id", { count: "exact", head: true })
        .in("booking_id", bookingIds),
    ]);
    if (invoiceCheck.error) {
      recordFailure("verify invoice cleanup", invoiceCheck.error.message);
    } else if ((invoiceCheck.count ?? 0) !== 0) {
      recordFailure("verify invoice cleanup", `${invoiceCheck.count} invoices remain`);
    }
    if (paymentCheck.error) {
      recordFailure("verify payment cleanup", paymentCheck.error.message);
    } else if ((paymentCheck.count ?? 0) !== 0) {
      recordFailure("verify payment cleanup", `${paymentCheck.count} payments remain`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`Journey cleanup was incomplete:\n- ${failures.join("\n- ")}`);
  }
}

function createHttpClient(baseUrl: string, fixture: Fixture) {
  async function request(role: Role, path: string, options: RequestOptions = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? "GET",
      redirect: "manual",
      headers: {
        cookie: `${TEST_COOKIE}=${role}`,
        "x-forwarded-for": fixture.requestAddress,
        ...(options.body === undefined ? {} : { "content-type": "application/json" }),
        ...options.headers,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const text = await response.text();
    let payload: unknown = text;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        // Page responses intentionally stay as HTML strings.
      }
    }
    const expectedStatus = options.expectedStatus ?? 200;
    assert.equal(
      response.status,
      expectedStatus,
      `${options.method ?? "GET"} ${path}: expected ${expectedStatus}, received ${response.status}: ${responsePreview(payload)}`
    );
    return { response, payload };
  }

  async function page(role: Role, path: string) {
    const result = await request(role, path);
    assert.match(
      result.response.headers.get("content-type") ?? "",
      /text\/html/,
      `${path} should render HTML`
    );
    assert.ok(
      typeof result.payload === "string" && result.payload.length > 500,
      `${path} should render a non-empty application shell`
    );
    assert.doesNotMatch(result.payload as string, /Internal Server Error/i);
  }

  async function redirect(role: Role, path: string, expectedPath: string) {
    const { response } = await request(role, path, { expectedStatus: 307 });
    const location = response.headers.get("location");
    assert.ok(location, `${path} should include a redirect location`);
    assert.equal(new URL(location, baseUrl).pathname, expectedPath);
  }

  return { request, page, redirect };
}

async function runJourneys(
  baseUrl: string,
  fixture: Fixture,
  supabase: TestSupabase
) {
  const http = createHttpClient(baseUrl, fixture);
  const completed: { name: string; elapsedMs: number }[] = [];

  async function check(name: string, action: () => Promise<void>) {
    const startedAt = Date.now();
    await action();
    const elapsedMs = Date.now() - startedAt;
    completed.push({ name, elapsedMs });
    console.log(`PASS ${name} (${elapsedMs} ms)`);
  }

  await check("portal pages render and cross-role portal redirects hold", async () => {
    await http.page("client", "/client");
    await http.page("vendor", "/vendor");
    await http.page("manager", "/manager");
    await http.page("admin", "/admin");

    await http.redirect("client", "/admin", "/client");
    await http.redirect("vendor", "/manager", "/vendor");
    await http.redirect("manager", "/client", "/manager");
    await http.redirect("admin", "/vendor", "/admin");
  });

  await check("role dashboards load and privileged APIs deny the wrong roles", async () => {
    const clientDashboard = await http.request("client", "/api/dashboard/client");
    assert.equal(asRecord(clientDashboard.payload, "client dashboard").needsOnboarding, true);
    await http.request("vendor", "/api/dashboard/vendor");
    await http.request("manager", "/api/dashboard/manager");
    await http.request("admin", "/api/dashboard/admin");

    await http.request("client", "/api/admin/pricing", { expectedStatus: 403 });
    await http.request("vendor", "/api/client/billing", { expectedStatus: 403 });
    await http.request("manager", "/api/admin/billing", { expectedStatus: 403 });
    await http.request("admin", "/api/dashboard/vendor", { expectedStatus: 403 });
  });

  await check("client onboarding creates one complete planner structure", async () => {
    const eventName = `Authenticated Journey ${fixture.runId}`;
    const creation = await http.request("client", "/api/wedding", {
      method: "POST",
      expectedStatus: 201,
      body: {
        coupleName: eventName,
        partnerName: "Journey Client",
        weddingDate: "2027-02-20T12:00:00.000Z",
        guestCount: 80,
        dayCount: 1,
        eventType: "corporate",
        primaryVenue: "Journey Test Hall",
        eventDefinition: {
          eventType: "corporate",
          primaryVenue: "Journey Test Hall",
          dayCount: 1,
          days: [
            {
              name: "Journey Day",
              date: "2027-02-20",
              timeBlocks: [
                {
                  slot: "morning",
                  enabled: true,
                  title: "Authenticated Journey Session",
                  eventType: "Conference Session",
                  startTime: "09:00",
                  endTime: "12:00",
                  venue: "Journey Test Hall",
                  guestCount: 80,
                  requirementCategories: ["food", "photo-video"],
                  notes: "Test-only function created by the authenticated journey harness.",
                },
                { slot: "afternoon", enabled: false, title: "Afternoon" },
                { slot: "evening", enabled: false, title: "Evening" },
              ],
            },
          ],
        },
      },
    });
    fixture.weddingId = String(asRecord(creation.payload, "event creation").weddingId);
    assert.match(fixture.weddingId, /^[0-9a-f-]{36}$/i);

    const planner = await http.request("client", "/api/wedding");
    const plannerBody = asRecord(planner.payload, "planner payload");
    const wedding = asRecord(plannerBody.wedding, "planner wedding");
    assert.equal(wedding.id, fixture.weddingId);
    assert.equal(wedding.name, eventName);
    assert.equal(wedding.event_type, "corporate");
    const days = asArray(plannerBody.days, "planner days");
    assert.equal(days.length, 1);
    const plannerDay = asRecord(days[0], "planner day");
    fixture.dayId = String(plannerDay.id);
    const events = asArray(plannerDay.events, "planner events");
    assert.equal(events.length, 1);
    const event = asRecord(events[0], "planner event");
    fixture.eventId = String(event.id);
    assert.equal(event.name, "Authenticated Journey Session");
    assert.equal(event.venue, "Journey Test Hall");
    assert.equal(event.guest_count, 80);
    assert.deepEqual(
      asArray(event.requirements, "event requirements")
        .map((entry) => String(asRecord(entry, "event requirement").category))
        .sort(),
      ["food", "photo-video"]
    );
    assert.equal(asArray(event.menus, "event menus").length, 1);
    await http.page("client", "/client/wedding");
  });

  await check("Layer 2 planning saves atomically through the authenticated API", async () => {
    assert.ok(
      fixture.eventId &&
        fixture.dayId &&
        fixture.vendorProfileId &&
        fixture.vendorServiceId
    );
    const venueCatalogue = await http.request("client", "/api/venues?limit=30");
    const journeyVenue = asArray(
      asRecord(venueCatalogue.payload, "venue catalogue").venues,
      "venue catalogue rows"
    )
      .map((entry) => asRecord(entry, "venue catalogue row"))
      .find(
        (venue) =>
          venue.capacity == null ||
          (typeof venue.capacity === "number" && venue.capacity >= 84)
      );
    assert.ok(journeyVenue, "the venue catalogue needs one option for 84 guests");
    const workspaceEvent = {
      weddingDayId: fixture.dayId,
      name: "Authenticated Journey Session Updated",
      eventType: "Conference Session",
      date: "2027-02-20",
      startTime: "09:15",
      endTime: "12:15",
      venue: String(journeyVenue.name),
      venueId: String(journeyVenue.id),
      guestCount: 84,
      estimatedBudget: 180000,
      foodStyle: "Plated",
      foodPreferences: ["vegetarian"],
      menuNotes: "Journey menu direction",
      decorStyle: "Editorial",
      decorNotes: "Journey stage direction",
      attireNotes: "Business formal",
      notes: "Authenticated full-workspace save.",
      requirementPayload: { stepNotes: { basics: "Authenticated save" } },
    };
    const planningPayload = {
      menus: [
        {
          name: "Journey working dinner",
          mealPeriod: "DINNER",
          serviceStyle: "PLATED",
          notes: "Authenticated Layer 2 save.",
          items: [
            {
              name: "Seasonal starter",
              course: "STARTER",
              dietaryTags: ["vegetarian"],
              notes: "Test-only menu item.",
            },
          ],
        },
      ],
      logistics: {
        guestArrivalTime: "08:30",
        vendorLoadInTime: "07:00",
        familyCallTime: null,
        transportNotes: "Journey shuttle loop",
        roomingNotes: null,
        weatherPlan: "Move the session inside",
        ceremonyNotes: null,
      },
      tasks: [
        {
          title: "Confirm the journey run of show",
          owner: "Planner",
          status: "IN_PROGRESS",
          dueDate: "2027-02-15T09:00:00.000Z",
        },
      ],
      requirements: [
        {
          category: "food",
          title: "Journey catering brief",
          status: "NEEDS_VENDOR",
          priority: "HIGH",
          payload: { dietaryMode: "mixed" },
          notes: "Confirm the final covers.",
        },
        {
          category: "photo-video",
          title: "Journey coverage brief",
          status: "DRAFT",
          priority: "NORMAL",
          payload: { coverage: "session" },
          notes: "Capture stage and guest arrivals.",
        },
      ],
    };

    await http.request("client", "/api/wedding/events/not-a-uuid/workspace", {
      method: "PATCH",
      expectedStatus: 400,
      body: {
        event: workspaceEvent,
        planning: planningPayload,
        vendorSelections: [],
      },
    });
    await http.request(
      "client",
      `/api/wedding/events/${fixture.eventId}/workspace`,
      { method: "PATCH", expectedStatus: 400, body: [] }
    );

    await http.request(
      "client",
      `/api/wedding/events/${fixture.eventId}/workspace`,
      {
        method: "PATCH",
        body: {
          event: workspaceEvent,
          planning: planningPayload,
          vendorSelections: [
            {
              vendorProfileId: fixture.vendorProfileId,
              vendorServiceId: fixture.vendorServiceId,
            },
          ],
        },
      }
    );
    await http.request(
      "vendor",
      `/api/wedding/events/${fixture.eventId}/workspace`,
      {
        method: "PATCH",
        body: {
          event: workspaceEvent,
          planning: planningPayload,
          vendorSelections: [],
        },
        expectedStatus: 403,
      }
    );

    const savedPlan = asRecord(
      (await http.request("client", "/api/wedding")).payload,
      "saved planner"
    );
    const savedEvent = asRecord(
      asArray(
        asRecord(asArray(savedPlan.days, "saved days")[0], "saved day").events,
        "saved events"
      )[0],
      "saved event"
    );
    assert.equal(savedEvent.name, "Authenticated Journey Session Updated");
    assert.equal(savedEvent.guest_count, 84);
    assert.equal(savedEvent.venue_id, journeyVenue.id);
    assert.equal(
      asRecord(asArray(savedEvent.menus, "saved menus")[0], "saved menu").name,
      "Journey working dinner"
    );
    assert.equal(
      asRecord(savedEvent.logistics, "saved logistics").transportNotes,
      "Journey shuttle loop"
    );

    const createdWithCatalogueVenue = asRecord(
      (
        await http.request("client", "/api/wedding/events", {
          method: "POST",
          expectedStatus: 201,
          body: {
            weddingDayId: fixture.dayId,
            name: "Catalogue venue regression",
            eventType: "Breakout Session",
            timeBlock: "afternoon",
            date: "2027-02-20",
            startTime: "14:00",
            endTime: "15:00",
            venue: String(journeyVenue.name),
            venueId: String(journeyVenue.id),
            guestCount: 40,
          },
        })
      ).payload,
      "catalogue venue event creation"
    );
    const catalogueVenueEvent = asRecord(
      createdWithCatalogueVenue.event,
      "catalogue venue event"
    );
    assert.equal(catalogueVenueEvent.venue_id, journeyVenue.id);
    await http.request(
      "client",
      `/api/wedding/events/${String(catalogueVenueEvent.id)}`,
      { method: "DELETE" }
    );
    assert.equal(
      asRecord(asArray(savedEvent.tasks, "saved tasks")[0], "saved task").title,
      "Confirm the journey run of show"
    );

    await http.request(
      "client",
      `/api/wedding/events/${fixture.eventId}/workspace`,
      {
        method: "PATCH",
        expectedStatus: 409,
        body: {
          event: {
            ...workspaceEvent,
            name: "This event name must roll back",
          },
          planning: {
            ...planningPayload,
            menus: [
              {
                ...planningPayload.menus[0],
                name: "This menu must roll back",
              },
            ],
            logistics: {
              ...planningPayload.logistics,
              transportNotes: "This logistics change must roll back",
            },
            tasks: [
              {
                ...planningPayload.tasks[0],
                title: "This task must roll back",
              },
            ],
            requirements: planningPayload.requirements.map(
              (requirement, index) =>
                index === 0
                  ? { ...requirement, vendorServiceId: randomUUID() }
                  : requirement
            ),
          },
          vendorSelections: [
            {
              vendorProfileId: fixture.vendorProfileId,
              vendorServiceId: fixture.vendorServiceId,
            },
          ],
        },
      }
    );

    const afterFailurePlan = asRecord(
      (await http.request("client", "/api/wedding")).payload,
      "planner after failed save"
    );
    const afterFailureEvent = asRecord(
      asArray(
        asRecord(
          asArray(afterFailurePlan.days, "days after failed save")[0],
          "day after failed save"
        ).events,
        "events after failed save"
      )[0],
      "event after failed save"
    );
    assert.equal(
      afterFailureEvent.name,
      "Authenticated Journey Session Updated"
    );
    assert.equal(
      asRecord(
        asArray(afterFailureEvent.menus, "menus after failed save")[0],
        "menu after failed save"
      ).name,
      "Journey working dinner"
    );
    assert.equal(
      asRecord(afterFailureEvent.logistics, "logistics after failed save")
        .transportNotes,
      "Journey shuttle loop"
    );
    assert.equal(
      asRecord(
        asArray(afterFailureEvent.tasks, "tasks after failed save")[0],
        "task after failed save"
      ).title,
      "Confirm the journey run of show"
    );
  });

  await check("supporting client and vendor workspaces persist without orphaning data", async () => {
    assert.ok(fixture.vendorServiceId);

    await http.request("client", "/api/settings/client", {
      method: "PATCH",
      body: {
        name: "Authenticated Journey Client",
        phone: "+910000000001",
        partnerName: "Journey Co-host",
        guestCount: 84,
      },
    });
    const clientSettings = asRecord(
      (await http.request("client", "/api/settings/client")).payload,
      "client settings"
    );
    assert.equal(
      asRecord(clientSettings.user, "client settings user").phone,
      "+910000000001"
    );
    assert.equal(
      asRecord(clientSettings.clientProfile, "client settings profile").guestCount,
      84
    );

    const guest = asRecord(
      (
        await http.request("client", "/api/guests", {
          method: "POST",
          expectedStatus: 201,
          body: {
            name: "Journey Guest",
            email: "journey-guest@example.test",
            side: "COUPLE",
            mealPref: "Vegetarian",
            plusOne: false,
          },
        })
      ).payload,
      "created guest"
    );
    const guestId = String(guest.id);
    const updatedGuest = asRecord(
      (
        await http.request("client", `/api/guests/${guestId}`, {
          method: "PATCH",
          body: { rsvp_status: "CONFIRMED", table_number: 4 },
        })
      ).payload,
      "updated guest"
    );
    assert.equal(updatedGuest.rsvp_status, "CONFIRMED");
    assert.equal(updatedGuest.table_number, 4);

    const timelineItem = asRecord(
      (
        await http.request("client", "/api/timeline", {
          method: "POST",
          expectedStatus: 201,
          body: {
            title: "Journey dashboard follow-up",
            description: "Created by the authenticated dashboard closure test.",
            dueDate: "2027-02-19T12:00:00.000Z",
          },
        })
      ).payload,
      "created timeline item"
    );
    const timelineId = String(timelineItem.id);
    const updatedTimelineItem = asRecord(
      (
        await http.request("client", `/api/timeline/${timelineId}`, {
          method: "PATCH",
          body: { isCompleted: true },
        })
      ).payload,
      "updated timeline item"
    );
    assert.equal(updatedTimelineItem.is_completed, true);

    const moodItem = asRecord(
      (
        await http.request("client", "/api/mood-boards", {
          method: "POST",
          expectedStatus: 201,
          body: {
            imageUrl: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3",
            caption: "Journey reference board",
            category: "Venue",
          },
        })
      ).payload,
      "created mood-board item"
    );
    const moodItemId = String(moodItem.id);

    await http.request("vendor", "/api/vendor/profile", {
      method: "PUT",
      body: {
        businessName: fixture.vendorName,
        shortBio: "Verified through the authenticated dashboard closure journey.",
        city: "Test City",
        state: "Test State",
        experience: 6,
      },
    });
    await http.request("vendor", "/api/settings/vendor", {
      method: "PATCH",
      body: {
        phone: "+910000000002",
        businessName: fixture.vendorName,
        city: "Test City",
        state: "Test State",
        country: "India",
        taxId: "TEST-GST-001",
        acceptingInquiries: true,
      },
    });
    const vendorSettings = asRecord(
      (await http.request("vendor", "/api/settings/vendor")).payload,
      "vendor settings"
    );
    assert.equal(
      asRecord(vendorSettings.user, "vendor settings user").phone,
      "+910000000002"
    );
    assert.equal(
      asRecord(vendorSettings.vendor, "vendor settings profile").taxId,
      "TEST-GST-001"
    );

    const updatedService = asRecord(
      (
        await http.request(
          "vendor",
          `/api/vendor/services/${fixture.vendorServiceId}`,
          {
            method: "PATCH",
            body: {
              serviceScope: "Journey-tested coordination and live delivery.",
              eventTypeFit: ["corporate", "conference", "retreat"],
              inclusions: ["Planning lead", "Run-of-show", "Event handoff"],
              deliverables: ["Final operations brief"],
              addOns: ["Guest desk"],
            },
          }
        )
      ).payload,
      "updated vendor service"
    );
    assert.equal(
      updatedService.service_scope,
      "Journey-tested coordination and live delivery."
    );

    for (const role of ["client", "vendor", "manager", "admin"] as const) {
      const notificationPayload = asRecord(
        (await http.request(role, "/api/notifications")).payload,
        `${role} notifications`
      );
      assert.ok(Array.isArray(notificationPayload.notifications));
      await http.request(role, "/api/notifications", {
        method: "PATCH",
        body: { all: true },
      });
    }

    await http.request("client", `/api/mood-boards/items/${moodItemId}`, {
      method: "DELETE",
    });
    await http.request("client", `/api/timeline/${timelineId}`, {
      method: "DELETE",
    });
    await http.request("client", `/api/guests/${guestId}`, {
      method: "DELETE",
    });

    const [guests, timeline, moodBoards] = await Promise.all([
      http.request("client", "/api/guests"),
      http.request("client", "/api/timeline"),
      http.request("client", "/api/mood-boards"),
    ]);
    assert.equal(
      asArray(asRecord(guests.payload, "guest list").guests, "guest rows").some(
        (entry) => asRecord(entry, "guest row").id === guestId
      ),
      false
    );
    assert.equal(
      asArray(asRecord(timeline.payload, "timeline").items, "timeline rows").some(
        (entry) => asRecord(entry, "timeline row").id === timelineId
      ),
      false
    );
    assert.equal(
      asArray(asRecord(moodBoards.payload, "mood boards").items, "mood-board rows").some(
        (entry) => asRecord(entry, "mood-board row").id === moodItemId
      ),
      false
    );
  });

  await check("platform manager can oversee every persisted event before employee scoping", async () => {
    assert.ok(fixture.weddingId);

    const eventsPayload = asRecord(
      (await http.request("manager", "/api/operations/events")).payload,
      "platform manager operations event list"
    );
    const event = asArray(eventsPayload.events, "platform manager operations events")
      .map((entry) => asRecord(entry, "platform manager operations event"))
      .find((entry) => entry.id === fixture.weddingId);
    assert.ok(event, "an unprofiled platform manager should see the created event");

    const workspace = asRecord(
      (
        await http.request(
          "manager",
          `/api/operations/events/${fixture.weddingId}`
        )
      ).payload,
      "platform manager operations workspace"
    );
    assert.equal(
      asRecord(workspace.event, "platform manager workspace event").id,
      fixture.weddingId
    );
    assert.equal(
      asRecord(workspace.access, "platform manager workspace access").eventRole,
      "Platform manager"
    );

    for (const path of [
      "/manager",
      "/manager/operations",
      `/manager/operations/${fixture.weddingId}`,
      `/manager/operations/${fixture.weddingId}/print`,
      "/manager/inquiries",
      "/manager/bookings",
      "/manager/messages",
      "/manager/clients",
      "/manager/vendors",
      "/manager/weddings",
      "/manager/destinations",
      "/manager/settings",
    ]) {
      await http.page("manager", path);
    }
    await http.page("manager", "/manager/configurator");
  });

  await check("admin assigns event-scoped operations access and incidents preserve lifecycle", async () => {
    assert.ok(fixture.weddingId && fixture.eventId);

    await http.request("admin", "/api/admin/team", {
      method: "PATCH",
      body: {
        action: "PROFILE",
        userId: fixture.userIds.manager,
        roleTemplate: "OPS_LEAD",
        jobTitle: "Journey operations lead",
        phone: "+910000000000",
        isActive: true,
      },
    });
    await http.request("admin", "/api/admin/team", {
      method: "PATCH",
      body: {
        action: "ASSIGNMENT",
        userId: fixture.userIds.manager,
        eventId: fixture.weddingId,
        eventRole: "Event lead",
        shiftStart: "2027-02-20T02:30:00.000Z",
        shiftEnd: "2027-02-20T15:30:00.000Z",
        notes: "Authenticated journey handoff.",
        permissions: null,
        isActive: true,
      },
    });

    const team = asRecord(
      (await http.request("admin", "/api/admin/team")).payload,
      "admin team"
    );
    const manager = asArray(team.staff, "admin team staff")
      .map((entry) => asRecord(entry, "admin team member"))
      .find((entry) => entry.id === fixture.userIds.manager);
    assert.ok(manager, "manager should appear in the operations team directory");
    assert.equal(
      asRecord(manager.profile, "manager operations profile").role_template,
      "OPS_LEAD"
    );
    assert.equal(asArray(manager.assignments, "manager assignments").length, 1);

    for (const path of [
      "/api/dashboard/manager",
      "/api/admin/clients",
      "/api/admin/users",
      "/api/admin/vendors",
      "/api/admin/inquiries",
      "/api/bookings",
    ]) {
      await http.request("manager", path, { expectedStatus: 403 });
    }

    const eventsPayload = asRecord(
      (await http.request("manager", "/api/operations/events")).payload,
      "operations event list"
    );
    assert.equal(asArray(eventsPayload.events, "operations events").length, 1);
    assert.equal(
      asRecord(asArray(eventsPayload.events, "operations events")[0], "operations event").id,
      fixture.weddingId
    );

    const workspace = asRecord(
      (
        await http.request(
          "manager",
          `/api/operations/events/${fixture.weddingId}`
        )
      ).payload,
      "operations workspace"
    );
    assert.equal(asRecord(workspace.event, "operations workspace event").id, fixture.weddingId);
    assert.equal(asArray(workspace.team, "operations workspace team").length, 1);
    assert.equal(
      hasKeyDeep(workspace, "vendorAmount"),
      false,
      "operations workspace must never expose vendor settlement amounts"
    );

    const created = asRecord(
      (
        await http.request(
          "manager",
          `/api/operations/events/${fixture.weddingId}/items`,
          {
            method: "POST",
            expectedStatus: 201,
            body: {
              kind: "INCIDENT",
              severity: "URGENT",
              title: "Journey shuttle delayed",
              body: "Driver is ten minutes behind the call time.",
              eventId: fixture.eventId,
              assigneeUserId: fixture.userIds.manager,
              dueAt: "2027-02-20T03:00:00.000Z",
            },
          }
        )
      ).payload,
      "operations item creation"
    );
    const itemId = String(asRecord(created.item, "operations item").id);
    await http.request(
      "manager",
      `/api/operations/events/${fixture.weddingId}/items/${itemId}`,
      { method: "PATCH", body: { status: "ACKNOWLEDGED" } }
    );
    const resolved = asRecord(
      (
        await http.request(
          "manager",
          `/api/operations/events/${fixture.weddingId}/items/${itemId}`,
          { method: "PATCH", body: { status: "RESOLVED" } }
        )
      ).payload,
      "resolved operations item"
    );
    assert.equal(asRecord(resolved.item, "resolved item").status, "RESOLVED");

    await http.request("client", "/api/operations/events", { expectedStatus: 403 });
    await http.page("manager", `/manager/operations/${fixture.weddingId}`);
    await http.page("manager", `/manager/operations/${fixture.weddingId}/print`);
  });

  await check("vendor discovery, detail, and shortlist are connected", async () => {
    assert.ok(fixture.vendorProfileId && fixture.vendorServiceId);
    const discovery = await http.request(
      "client",
      `/api/vendors?q=${encodeURIComponent(fixture.vendorName)}`
    );
    const vendors = asArray(asRecord(discovery.payload, "vendor discovery").vendors, "vendors");
    const vendor = vendors
      .map((entry) => asRecord(entry, "vendor result"))
      .find((entry) => entry.id === fixture.vendorProfileId);
    assert.ok(vendor, "the isolated vendor must be discoverable");
    assert.equal(hasKeyDeep(vendor, "user_id"), false, "public discovery must not leak user ids");

    const detail = await http.request("client", `/api/vendors/${fixture.vendorSlug}`);
    const detailBody = asRecord(detail.payload, "vendor detail");
    assert.equal(detailBody.id, fixture.vendorProfileId);
    assert.equal(hasKeyDeep(detailBody, "user_id"), false, "public detail must not leak user ids");
    assert.equal(asArray(detailBody.services, "vendor services").length, 2);

    const saved = await http.request("client", "/api/saved-vendors", {
      method: "POST",
      expectedStatus: 201,
      body: { slug: fixture.vendorSlug },
    });
    assert.equal(asRecord(saved.payload, "saved vendor").saved, true);
    const shortlist = await http.request("client", "/api/saved-vendors");
    assert.ok(
      asArray(asRecord(shortlist.payload, "shortlist").savedSlugs, "saved slugs").includes(
        fixture.vendorSlug
      )
    );
  });

  await check("booking and two-way messaging work with ownership enforcement", async () => {
    assert.ok(
      fixture.vendorProfileId &&
        fixture.vendorServiceId &&
        fixture.freshVendorServiceId &&
        fixture.eventId
    );

    const freshBookingResponse = await http.request("client", "/api/bookings", {
      method: "POST",
      expectedStatus: 201,
      body: {
        vendorProfileId: fixture.vendorProfileId,
        vendorServiceId: fixture.freshVendorServiceId,
        weddingEventId: fixture.eventId,
        notes: "A genuinely new booking that must exercise the database insert path.",
      },
    });
    const freshBooking = asRecord(
      freshBookingResponse.payload,
      "freshly created booking"
    );
    assert.match(String(freshBooking.id), /^[0-9a-f-]{36}$/i);

    const bookingResponse = await http.request("client", "/api/bookings", {
      method: "POST",
      expectedStatus: 200,
      body: {
        vendorProfileId: fixture.vendorProfileId,
        vendorServiceId: fixture.vendorServiceId,
        weddingEventId: fixture.eventId,
        notes: "Test-only inquiry from the authenticated journey harness.",
      },
    });
    const booking = asRecord(bookingResponse.payload, "created booking");
    fixture.bookingId = String(booking.id);
    assert.match(fixture.bookingId, /^[0-9a-f-]{36}$/i);
    assert.equal(hasKeyDeep(booking, "vendor_amount"), false);
    assert.equal(hasKeyDeep(booking, "final_price"), false);

    await http.request("client", `/api/bookings/${fixture.bookingId}`, {
      method: "PATCH",
      expectedStatus: 403,
      body: { status: "CONFIRMED" },
    });
    await http.request("vendor", `/api/bookings/${fixture.bookingId}`, {
      method: "PATCH",
      expectedStatus: 409,
      body: { status: "CONFIRMED" },
    });

    const clientMessage = `Client journey message ${fixture.runId}`;
    const vendorMessage = `Vendor journey reply ${fixture.runId}`;
    await http.request("client", "/api/messages", {
      method: "POST",
      expectedStatus: 201,
      body: { bookingId: fixture.bookingId, content: clientMessage },
    });
    await http.request("vendor", "/api/messages", {
      method: "POST",
      expectedStatus: 201,
      body: { bookingId: fixture.bookingId, content: vendorMessage },
    });
    await http.request("manager", "/api/messages", {
      method: "POST",
      expectedStatus: 403,
      body: { bookingId: fixture.bookingId, content: "Operations may read, not impersonate." },
    });

    for (const role of ["client", "vendor", "manager", "admin"] as const) {
      const messages = await http.request(role, "/api/messages");
      const conversations = asArray(
        asRecord(messages.payload, `${role} messages`).conversations,
        `${role} conversations`
      );
      const conversation = conversations
        .map((entry) => asRecord(entry, `${role} conversation`))
        .find((entry) => entry.id === fixture.bookingId);
      assert.ok(conversation, `${role} should see the test conversation`);
      if (role === "manager") {
        const visibleConversationIds = conversations.map((entry) =>
          String(asRecord(entry, "manager conversation").id)
        );
        assert.equal(
          conversations.length,
          2,
          "event-scoped operations employees must not see unassigned threads"
        );
        assert.ok(
          visibleConversationIds.includes(String(freshBooking.id)),
          "event-scoped operations employees should see every assigned booking"
        );
      }
      const messageTexts = asArray(conversation.messages, `${role} thread messages`).map(
        (entry) => String(asRecord(entry, `${role} thread message`).text)
      );
      assert.deepEqual(messageTexts, [clientMessage, vendorMessage]);
    }

    const archiveMessageCount = 45;
    const archiveMessages = Array.from({ length: archiveMessageCount }, (_, index) => ({
      booking_id: fixture.bookingId!,
      sender_id: fixture.userIds.client,
      content: `Archived journey message ${String(index + 1).padStart(2, "0")} ${fixture.runId}`,
      created_at: new Date(
        Date.now() - (archiveMessageCount - index + 10) * 60_000
      ).toISOString(),
    }));
    const archiveInsert = await supabase.from("messages").insert(archiveMessages);
    assert.equal(
      archiveInsert.error,
      null,
      archiveInsert.error?.message ?? "archived messages should seed"
    );

    const pagedInbox = await http.request("client", "/api/messages");
    const pagedConversation = asArray(
      asRecord(pagedInbox.payload, "paged inbox").conversations,
      "paged conversations"
    )
      .map((entry) => asRecord(entry, "paged conversation"))
      .find((entry) => entry.id === fixture.bookingId);
    assert.ok(pagedConversation);
    const recentMessages = asArray(
      pagedConversation.messages,
      "bounded recent messages"
    );
    const pageState = asRecord(
      pagedConversation.messagePage,
      "message page state"
    );
    assert.equal(recentMessages.length, 40);
    assert.equal(pageState.totalCount, 47);
    assert.equal(pageState.hasOlder, true);

    const olderParams = new URLSearchParams({
      bookingId: fixture.bookingId,
      beforeCreatedAt: String(pageState.oldestCreatedAt),
      beforeId: String(pageState.oldestId),
    });
    const olderResponse = await http.request(
      "client",
      `/api/messages?${olderParams.toString()}`
    );
    const olderMessages = asArray(
      asRecord(olderResponse.payload, "older message page").messages,
      "older messages"
    );
    const olderPage = asRecord(
      asRecord(olderResponse.payload, "older message page").page,
      "older page state"
    );
    assert.equal(olderMessages.length, 7);
    assert.equal(olderPage.hasOlder, false);

    const combinedIds = [...olderMessages, ...recentMessages].map((entry) =>
      String(asRecord(entry, "combined message").id)
    );
    assert.equal(new Set(combinedIds).size, 47);

    await http.request("client", `/api/messages?bookingId=${fixture.bookingId}`, {
      expectedStatus: 400,
    });

    await http.request("admin", `/api/bookings/${fixture.bookingId}`, {
      method: "PATCH",
      body: { status: "CONFIRMED" },
    });
    const vendorBookings = await http.request("vendor", "/api/bookings");
    const vendorBooking = asArray(
      asRecord(vendorBookings.payload, "vendor bookings").bookings,
      "vendor booking rows"
    )
      .map((entry) => asRecord(entry, "vendor booking"))
      .find((entry) => entry.id === fixture.bookingId);
    assert.ok(vendorBooking, "vendor should see the confirmed booking");
  });

  await check("budget reflects the planner vendor selection without exposing pricing", async () => {
    assert.ok(fixture.bookingId);
    const budget = await http.request("client", "/api/budget");
    const budgetBody = asRecord(budget.payload, "budget payload");
    assert.equal(budgetBody.needsOnboarding, false);
    const lineItem = asArray(budgetBody.planLineItems, "budget line items")
      .map((entry) => asRecord(entry, "budget line item"))
      .find((entry) => entry.bookingId === fixture.bookingId);
    assert.ok(lineItem, "the selected vendor should appear in the event budget");
    assert.equal(lineItem.stage, "confirmed");
    assert.equal(lineItem.costState, "estimate");
    assert.equal(lineItem.estimatedCost, 125_000);
    await http.request("vendor", "/api/budget", { expectedStatus: 403 });
  });

  await check("admin fixed pricing and client invoice billing complete end to end", async () => {
    assert.ok(fixture.bookingId);
    const pricing = await http.request("admin", "/api/admin/pricing");
    const pricingMatch = findPricingBooking(pricing.payload, fixture.bookingId);
    assert.ok(pricingMatch, "admin pricing must include the journey booking");
    assert.equal(pricingMatch.client.email, fixture.emails.client);
    const revision = String(pricingMatch.booking.updatedAt);
    assert.ok(!Number.isNaN(Date.parse(revision)), "pricing must expose an optimistic revision");

    const priceUpdate = await http.request("admin", "/api/admin/pricing", {
      method: "PATCH",
      body: {
        bookingId: fixture.bookingId,
        vendorPrice: 150_000,
        fee: 25_000,
        pricePublished: true,
        updatedAt: revision,
      },
    });
    const pricedBooking = asRecord(
      asRecord(priceUpdate.payload, "pricing update").booking,
      "priced booking"
    );
    assert.equal(pricedBooking.vendorPrice, 150_000);
    assert.equal(pricedBooking.fee, 25_000);
    assert.equal(pricedBooking.finalPrice, 175_000);
    assert.equal(pricedBooking.pricePublished, true);

    await http.request("client", "/api/admin/billing", { expectedStatus: 403 });
    await http.request("vendor", "/api/admin/pricing", { expectedStatus: 403 });
    const billingWorkspace = await http.request(
      "admin",
      "/api/admin/billing?filter=ALL&pageSize=1"
    );
    const billingPayload = asRecord(
      billingWorkspace.payload,
      "billing workspace"
    );
    const billingPagination = asRecord(
      billingPayload.pagination,
      "billing pagination"
    );
    assert.equal(billingPagination.pageSize, 1);
    assert.ok(Number(billingPagination.total) >= 0);
    const billable = asArray(
      billingPayload.bookings,
      "billable bookings"
    )
      .map((entry) => asRecord(entry, "billable booking"))
      .find((entry) => entry.id === fixture.bookingId);
    assert.ok(billable, "the fixed-price booking must be billable");
    assert.equal(billable.finalPrice, 175_000);

    const dueDate = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
    const idempotencyKey = `journey-invoice-${fixture.runId}`;
    const issued = await http.request("admin", "/api/admin/billing", {
      method: "POST",
      expectedStatus: 201,
      headers: { "idempotency-key": idempotencyKey },
      body: {
        bookingId: fixture.bookingId,
        amount: 50_000,
        dueDate,
        label: "Journey test installment",
        description: "Test-only invoice removed during harness cleanup.",
      },
    });
    const invoice = asRecord(asRecord(issued.payload, "issued billing").invoice, "invoice");
    fixture.invoiceId = String(invoice.id);
    assert.match(fixture.invoiceId, /^[0-9a-f-]{36}$/i);
    assert.equal(invoice.amount, 50_000);
    assert.equal(invoice.status, "ISSUED");

    const searchedBilling = await http.request(
      "admin",
      `/api/admin/billing?filter=ALL&pageSize=1&search=${encodeURIComponent(String(invoice.invoiceNumber))}`
    );
    const searchedPayload = asRecord(
      searchedBilling.payload,
      "searched billing workspace"
    );
    const searchedInvoices = asArray(
      searchedPayload.invoices,
      "searched invoices"
    ).map((entry) => asRecord(entry, "searched invoice"));
    assert.equal(searchedInvoices.length, 1);
    assert.equal(searchedInvoices[0]?.id, fixture.invoiceId);
    assert.equal(
      asRecord(searchedPayload.pagination, "searched billing pagination").total,
      1
    );
    assert.ok(
      Number(asRecord(searchedPayload.summary, "complete billing summary").scheduled) >=
        50_000,
      "billing summary must remain complete when the register is filtered"
    );

    await http.request(
      "client",
      `/api/client/billing/${fixture.invoiceId}/checkout`,
      {
        method: "POST",
        expectedStatus: 503,
        headers: { "idempotency-key": `journey-checkout-${fixture.runId}` },
      }
    );
    await http.request(
      "vendor",
      `/api/client/billing/${fixture.invoiceId}/checkout`,
      {
        method: "POST",
        expectedStatus: 403,
        headers: { "idempotency-key": `journey-checkout-${fixture.runId}` },
      }
    );
    await http.request("client", "/api/webhooks/billing/testpay", {
      method: "POST",
      expectedStatus: 404,
      body: { event: "must-not-process-without-an-active-gateway" },
    });

    const clientBilling = await http.request("client", "/api/client/billing");
    const clientInvoice = asArray(
      asRecord(clientBilling.payload, "client billing").invoices,
      "client invoices"
    )
      .map((entry) => asRecord(entry, "client invoice"))
      .find((entry) => entry.id === fixture.invoiceId);
    assert.ok(clientInvoice, "client billing must show the issued installment");
    assert.equal(clientInvoice.amount, 50_000);
    assert.equal(hasKeyDeep(clientInvoice, "clientEmail"), false);
    const billingCapability = asRecord(
      asRecord(clientBilling.payload, "client billing").capability,
      "billing capability"
    );
    assert.equal(billingCapability.onlineCheckout, false);
    assert.equal(billingCapability.collectionModel, "FULL_CLIENT_PRICE");

    const clientBookings = await http.request("client", "/api/bookings");
    const clientBooking = asArray(
      asRecord(clientBookings.payload, "client bookings").bookings,
      "client booking rows"
    )
      .map((entry) => asRecord(entry, "client booking"))
      .find((entry) => entry.id === fixture.bookingId);
    assert.ok(clientBooking);
    assert.equal(hasKeyDeep(clientBooking, "vendor_amount"), false);
    assert.equal(hasKeyDeep(clientBooking, "service_fee"), false);

    await http.request("client", "/api/wedding", {
      method: "DELETE",
      expectedStatus: 409,
    });
    const preservedPlan = asRecord(
      (await http.request("client", "/api/wedding")).payload,
      "planner after blocked whole-plan deletion"
    );
    assert.equal(
      asRecord(preservedPlan.wedding, "preserved wedding").id,
      fixture.weddingId,
      "billing history must leave the complete event plan intact"
    );
  });

  await check("every portal navigation destination renders for its role", async () => {
    for (const role of Object.keys(PORTAL_ROUTE_MATRIX) as Role[]) {
      for (const path of PORTAL_ROUTE_MATRIX[role]) {
        await http.page(role, path);
      }
    }
  });

  return completed;
}

async function main() {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    throw new Error("Authenticated journey verification is local-development only");
  }
  assert.equal(
    process.cwd().endsWith("elysian-celebrations"),
    true,
    "Run this script from the Elysian repository root"
  );

  const supabase = createTestSupabase();
  const fixture = makeFixture();
  let server: ServerHandle | null = null;
  let journeyError: unknown = null;
  let cleanupError: unknown = null;
  const startedAt = Date.now();

  console.log(`Authenticated journey run: ${fixture.runId}`);
  console.log("Creating isolated test identities...");

  try {
    await seedFixture(supabase, fixture);
    server = await startDevelopmentServer(fixture);
    console.log(`Local Next server ready at ${server.baseUrl}`);
    const completed = await runJourneys(server.baseUrl, fixture, supabase);
    console.log("");
    console.log(
      `Authenticated journeys passed: ${completed.length} groups in ${Date.now() - startedAt} ms.`
    );
    if (inspectionHoldMs > 0) {
      console.log(
        `Inspection window open for ${Math.round(inspectionHoldMs / 1000)} seconds at ${server.baseUrl}.`
      );
      await sleep(inspectionHoldMs);
    }
  } catch (error) {
    journeyError = error;
    if (server?.logs()) {
      console.error("\nLocal server log tail:\n" + server.logs());
    }
  } finally {
    await stopDevelopmentServer(server);
    try {
      await cleanupFixture(supabase, fixture);
      console.log("Cleanup verified: test identities, financials, and rate-limit rows removed.");
    } catch (error) {
      cleanupError = error;
    }
  }

  if (journeyError && cleanupError) {
    throw new AggregateError(
      [journeyError, cleanupError],
      "Authenticated journeys failed and cleanup was incomplete"
    );
  }
  if (cleanupError) throw cleanupError;
  if (journeyError) throw journeyError;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
