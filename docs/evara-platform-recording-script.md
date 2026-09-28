# Evara Platform Recording Script

**Recommended length:** 14-18 minutes

**Recording goal:** Show how Elysian turns Evara's disconnected planning files into one connected client, partner, commercial, and live-operations system using the Reeva & Vansh Gateway Bekal demo.

## Before Recording

1. Run the app locally and use a clean desktop browser window at 1440 x 900 or larger.
2. Keep zoom at 100%, close personal tabs, and hide bookmarks and notification previews.
3. Use the Reeva & Vansh client account first, then the Evara manager, one vendor, and the admin account.
4. Use the shared QA password already configured in `ELYSIAN_TEST_USER_PASSWORD`. Never display the password manager, environment files, Supabase, Clerk, or terminal in the recording.
5. Do not display private source workbooks, phone numbers, government IDs, PNRs, or family-tree files.
6. Do not click `Mark sent` in Guest Communications unless demonstrating a prepared sample; explain that provider delivery is intentionally human-controlled.

## 00:00-00:45 - Opening

**On screen:** Landing page, then Sign In.

**Say:**

"Elysian is an end-to-end event planning and live-delivery platform. For this walkthrough we reconstructed Reeva and Vansh's three-day Gateway Bekal wedding from Evara's operating files. Instead of keeping the event across separate vendor sheets, payment trackers, guest manifests, showflows, riders, and message drafts, Elysian connects those workflows around one event record and protects what each role is allowed to see."

## 00:45-02:00 - Client Command Center

**Action:** Sign in as `testing+reeva-vansh@elysiancelebrations.app`. Open `/client`.

**Say:**

"The couple enters through a calm command center rather than a spreadsheet index. Reeva and Vansh can see the next decisions, planning readiness, selected partners, guest state, spend direction, and upcoming functions without learning the internal operations system. Every card leads to a real persisted workspace."

**Show:** Event summary, next actions, notifications, selected partner or readiness cards.

## 02:00-04:15 - Event Plan: Define, Compose, Finalize

**Action:** Open `Event Plan`.

**Say:**

"Planning has three layers. Definition establishes the event structure. Composition opens the visual map. Finalization turns gaps into a closure checklist. The Gateway Bekal plan contains three days and nine functions, each anchored to its date, time, venue, guest count, and workstreams."

**Action:** Open Layer 2. Click Day 1, then Sangeet Night, then Food.

**Say:**

"The flowchart keeps the whole weekend readable. We move from day to function to one scoped editor, so the user never faces one enormous form. Food carries the service style, dietary direction, menu, selected catalogue rows, and custom requirements. The same function has its own decor, production, hospitality, logistics, tasks, and notes."

**Action:** Return to the function orbit. Open Design, Tasks, then Basics briefly.

**Say:**

"Each decision stays attached to the function where it will be executed. Date, timing, venue, guest count, partner choice, and operational notes remain in context. Saving does not throw the user back to the beginning."

**Action:** Open Layer 3.

**Say:**

"Finalization is not a decorative progress score. It tells the team what is complete, what is partial, and which exact decision blocks the function from being execution-ready."

## 04:15-05:40 - Vendors, Bookings, And Messages

**Action:** Open `Vendors`, then one profile, then `Bookings`, then `Messages`.

**Say:**

"Reeva and Vansh select from real service catalogues rather than typing vendor names. The demo connects photography, decor, catering, entertainment, beauty, logistics, and planning partners. Profiles show scope, inclusions, deliverables, add-ons, itemized catalogues, media, and price cues. Once selected, the booking carries the function, service, final client price, status, notes, and a contextual message thread."

**Pause on pricing. Say:**

"The commercial boundary is deliberate: the client sees the complete published price. Vendors only see and receive their agreed payout. Elysian's fixed fee is never exposed in the vendor portal."

## 05:40-07:20 - Guests, Travel, Rooming, And Hospitality

**Action:** Open `Guests`. Move through List, Travel, and Rooming/Hospitality views.

**Say:**

"The guest workspace replaces the separate RSVP, rooming, logistics, gifting, and hospitality sheets. It holds host side, relationship, household, invitation state, RSVP, meals, seating, travel legs, transfers, vehicles, hotel and room, keys, luggage, check-in and departure, accessibility, care actions, owner, and due time."

**Action:** Open one grouped demo guest.

**Say:**

"For the presentation dataset we use safe grouped records. The live product can manage the operational fields while sensitive identity documents and full PNRs remain outside broad exports by design."

## 07:20-08:30 - Cost, Budget, Billing, Timeline

**Action:** Open `Cost Estimate`, then `Budget`, then `Billing`, then `Timeline`.

**Say:**

"Spend can be read by function, day, category, vendor, payment state, and the whole event rather than one undifferentiated total. Planner selections flow into the budget context. Billing then separates the client invoice and receipt history from vendor settlements, including installments, manual reconciliation, refunds, and audit-safe voids. The timeline turns planning decisions into dated actions."

## 08:30-10:50 - Evara Live Operations

**Action:** Sign out and sign in as `testing+evara-manager@elysiancelebrations.app`. Open `Operations`, then Reeva & Vansh.

**Say:**

"The couple view is intentionally simple. The Evara team receives the operational depth. The event room opens with the live programme, readiness, open attention, partners, and the current event context."

**Action:** Open `Run of show`.

**Say:**

"Run of show connects function times, venues, guests, menus, logistics calls, tasks, and selected partners. This is the shared truth for production, hospitality, show calling, and guest movement."

**Action:** Open `Feed`.

**Say:**

"During the event, updates, decisions, incidents, and escalations are recorded with severity, function, department, zone, owner, due time, acknowledgement, and resolution. This replaces WhatsApp chaos with an accountable event record without preventing teams from communicating quickly."

## 10:50-12:35 - Production, Travel, And Guest Communications

**Action:** Open `Production dossier`.

**Say:**

"Contracts, riders, permits, recce findings, approvals, transport, rooming, inventory, packing, finance, family references, and communication records live in one permission-scoped dossier. Every record can have an owner, function, department, zone, due date, status, visibility, reference link, and immutable activity history."

**Action:** Open `Partner travel`.

**Say:**

"Artist, vendor, crew, speaker, and performer movement is separate from guest logistics. The desk connects selected bookings to travel legs, room nights, pickups, food or per diem, arrival and departure state, and exception filters."

**Action:** Open `Guest communications`. Choose a template, show segments, schedule, consent, and approval controls.

**Say:**

"Evara's RSVP drafts become controlled campaigns for RSVP, arrival, room keys, function invitations, breakfast, departure, emergency, and thank-you messages. The lifecycle is draft, approved, exported, and sent. Opted-out guests are excluded before approval. The recipient snapshot becomes immutable at export, and the team imports delivery results after the human send. No automatic WhatsApp provider is being simulated."

## 12:35-13:35 - Workforce And Event Book

**Action:** Open `Crew` and `Briefings`, then `Print event book` in a new tab.

**Say:**

"Evara can coordinate a large field team through departments, zones, shifts, supervisors, check-in and check-out, handoff notes, briefing attendance, and acknowledgements. The printable event book pulls from the same event source so field teams are not handed a different version of the truth. Sensitive financial and identity records remain excluded according to permission."

## 13:35-14:35 - Vendor Portal

**Action:** Sign in as `testing+the-story-room@elysiancelebrations.app`. Show Dashboard, Services, Bookings, Messages, Calendar, Portfolio, and Analytics.

**Say:**

"The partner portal is focused on delivery. A vendor maintains a visual, itemized service catalogue, sees only assigned bookings and agreed payout information, replies with event context, reviews confirmed dates, and manages portfolio and service depth. They never see Elysian's fee or another vendor's commercial record."

## 14:35-16:10 - Admin Control

**Action:** Sign in as `testing+admin@elysiancelebrations.app`. Show Events/Progress, Team, Venues, Vendors, Pricing, and Billing.

**Say:**

"Administration controls the platform without becoming the planning interface. It manages event oversight, employee identities and permissions, event assignment, destination and venue catalogues, vendor verification, fixed-fee pricing publication, client invoices, and payment reconciliation. Role enforcement is checked again on the server for every sensitive mutation."

**Action:** Open the Reeva & Vansh pricing record.

**Say:**

"There is no quote-negotiation workflow inside the platform. Evara confirms the vendor amount through its human commercial process, then the administrator records the agreed vendor payout, applies the fixed Elysian fee, and publishes one final client price."

## 16:10-17:00 - Close

**On screen:** Return to the Reeva & Vansh event overview or printable event book cover.

**Say:**

"Elysian does not simply digitize one spreadsheet. It connects the client plan, partner catalogue, final pricing, guests, travel, hospitality, showflow, workforce, communications, live incidents, and management oversight around one event. For Evara, the immediate value is one operating picture from the first definition through on-ground closure, while preserving the human judgement that premium events still require."

## If Time Is Limited

Use this 7-minute route:

1. Client dashboard and Layer 2 event map.
2. One function's Food, Design, Tasks, and Layer 3 readiness.
3. Guest Studio travel/rooming.
4. Cost Estimate and Billing.
5. Manager Run of Show, Feed, Guest Communications, and Crew.
6. Print event book.
7. Admin Pricing boundary and close.
