# Speaking Script — 9-slide internship presentation

Total: **≈ 4 minutes**, inside the rubric's 3–5 minute window.
Numbers are written as words where you say them aloud, so you don't stumble.

---

## Slide 1 — Cover · ~13s

> Good morning. I'm Rayyan Pasha, third year, Digital Transformation at Atria.
> I intern at TIPS Founder's Desk, and today I'm showing you what I built there —
> Elysian Celebrations.

*Pause. Click to slide 2.*

---

## Slide 2 — The role · ~29s

> My role is Founder's Desk Associate, reporting to Padmini Raghavendra, the Director.
>
> The mandate covers six areas — strategy support, digitising operations, venture
> building, EdTech and chatbot prototypes, hospitality and events, and research.
> Across those I've delivered SOPs, dashboards, trackers, chatbot prototypes and
> business decks.
>
> But area C — Elysian — is where most of my build work went. So that's what I'll
> focus on today.

---

## Slide 3 — The problem · ~24s

> Here's the problem.
>
> Planning a five-day celebration means twenty-plus functions. Right now that runs
> on spreadsheets, WhatsApp and memory.
>
> Nothing is connected — change the guest count and the menu quietly goes stale.
> Everything is typed by hand, so no system can price it or book it. And nobody can
> answer a simple question: are we ready for Day Three?

---

## Slide 4 — What I built · ~33s

> Elysian answers that in three layers.
>
> **Define** shapes the event — type, days, time blocks.
>
> **Map** is the core. It's a visual flow map where you drill from the event down to
> one day, one function, one step — so the form that finally opens is small enough
> to actually finish.
>
> **Finalize** proves readiness.
>
> It's sixty-one thousand lines of TypeScript, sixty-two routes, fifty-nine API
> endpoints, twenty-seven database tables, and four separate portals — client,
> vendor, manager and admin.

---

## Slide 5 — Live demo · ~50s

**Before you start:** site already open, already logged in, tab on the flow map.

> Let me show you the real thing.

*(1) Flow map*
> This is the flow map. I start at the event, open a day, then a function — and
> notice the editor only opens once I pick a step.

*(2) Vendor catalogue*
> Vendors are selected from a real catalogue, inside the need they belong to. Never
> typed. That's what makes them priceable and bookable.

*(3) Readiness gate*
> And this is the readiness gate — the client's final price only appears once the
> function is genuinely complete.

> Let me come back to the deck.

**If it fails:** say *"Looks like the connection's not cooperating — let me carry on"*
once, and move to slide 6. Do not debug in front of the panel.

---

## Slide 6 — Technologies used · ~21s

> The stack is deliberately production-grade.
>
> Next.js sixteen and React nineteen on the front end. Supabase Postgres behind it,
> with twenty-seven tables and twenty-five migrations — every schema change is in
> version control, none of it typed into a dashboard. Clerk handles authentication.
> And it ships continuously through Vercel.

---

## Slide 7 — Skills gained & challenges faced · ~35s

> What I gained: I went from writing features to owning a system — data modelling,
> authorisation design, and auditing my own code.
>
> The hardest challenge was this. Readiness was being calculated twice — once in the
> browser, once on the server — with different rules. And one of those copies decided
> whether a client could see a price.
>
> I collapsed it into a single server-side contract. The lesson stuck with me:
> duplicated logic near money isn't untidy — it's a security bug.

---

## Slide 8 — Academic learning applied & future goals · ~29s

> My programme is Digital Transformation, and this internship was exactly that.
>
> Process mapping became the flow map. Database modelling became twenty-seven tables
> with the business rules enforced in SQL. Data-driven decision making became
> readiness scoring instead of guesswork.
>
> And I'm not finished. I'm with TIPS through December twenty twenty-six. Next is
> architecture rather than features — and extending Elysian beyond events into
> hospitality, education and real estate.

---

## Slide 9 — Close · ~9s

> That's Elysian — built over the last year, and still being built.
>
> Thank you. I'm happy to take questions.

---

# Delivery notes

- **Pace.** You have room. Rushing is the most common way to lose Communication marks.
  Pause for one beat after each slide's first sentence.
- **Land the numbers.** Slow down slightly on "sixty-one thousand lines" and
  "twenty-seven tables" — those are the moments a panel writes something down.
- **Slide 7 is your best moment.** The readiness bug shows judgement, not just effort.
  Tell it like a short story: what was wrong, what you did, what you learned.
- **Own the unfinished parts.** Saying "I'm not finished" on slide 8 is a strength.
  It reads as honesty and scope awareness, not as an excuse.
- **Don't read the slides.** They're deliberately sparse so you can look up.

# Likely questions, and short answers

**"Did you build all of this yourself?"**
> Yes — the product, the schema, the API layer and the front end. I used AI tools the
> way I'd use any tool, but the architecture decisions and the audits are mine.

**"Why not just use an existing event-planning tool?"**
> Existing tools assume a single-day event with one guest list. Indian celebrations are
> multi-day and multi-function, and the whole point of the flow map is modelling that
> structure. Nothing off the shelf does it.

**"What's the hardest technical decision you made?"**
> Making every API route the security boundary. The browser holds no database
> credentials at all — row-level security is on with zero policies, so Postgres is only
> reachable through my fifty-nine handlers. The trade-off is that there's no second line
> of defence, which is exactly why I audited every one of them for ownership checks.

**"What would you do differently?"**
> Put transactions in from the start. Event creation writes to several tables and I
> compensate for failures in application code instead of rolling back. That's the first
> thing on my list.

**"How do you know it's secure?"**
> I wrote a security audit against my own code — all fifty-nine routes, dependencies,
> row-level security and schema. Three of four high findings are closed. One is still
> open: dashboards need a server-rendered role check as defence in depth. The data is
> protected by the API checks today, but it isn't layered yet.

**"How much time did this take?"**
> The engagement started in April twenty twenty-five and runs to December twenty
> twenty-six. Elysian has been the main build throughout.
