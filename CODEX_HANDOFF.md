# Elysian — work split & deep analysis (Claude → Codex)

_Last updated by Claude. Branch: `main`. This supersedes the earlier per-block-needs
handoff (that work is shipped — see "Previously shipped" at the bottom)._

Claude is staying on **marketing/landing + shared component libraries**. Codex owns the
**dashboard planner** (`client/wedding/page.tsx`) — it's a 5,327-line client component you've
been deep in, so to avoid merge pain Claude is **not** editing it. Instead Claude built two
ready-to-drop-in component files for you to wire in. Your queue is in §3.

---

## 1. What Claude already fixed (hero) — no action needed

`src/components/marketing/hero/hero-section.tsx` had real problems after the last polish pass:

- **3D stage was broken at desktop**: the two photo planes + MainStageCard overlapped into a
  cluttered pile, the right plane and the "Vendor packages" tag **clipped off the right edge**,
  the `FloatingTag`s used `translateZ(320px)` and **projected up behind the navbar** (the ghost
  box), and strong `rotateX/Y` **distorted the card text**.
- **Headline double-spacing**: each word had both a flex `gap-x` *and* a trailing spacer span →
  ~0.53em gaps ("Design  Events").

Fixed: rebuilt the stage as a single contained, gently-tilted planner card with one subtle
accent photo plane and two in-bounds status chips; dropped the extreme `translateZ`; trimmed the
card so it fits between navbar and fold. Verified live at 1440×900 — `overflowRight: 0`, card
top 114 (clears nav 107), bottom 892 (within fold). Lint clean.

**Remaining marketing items Claude will take next** (FYI, not yours): the nav has a faint
search/"Budget" command bar bleeding near the top-right on desktop; mobile hero layer-cards hide
their copy (`sm:block`) so they read as bare titles.

---

## 2. Two new drop-in components Claude built (tsc + lint + build green)

### `src/components/dashboard/planner-inputs.tsx` — low-typing input toolkit
The whole point: **clients tap, they don't type.** All controlled (`value` + `onChange`),
all allow a custom entry where needed.

| Component | Use for | Value type |
|---|---|---|
| `ChipMultiSelect({options,value,onChange,columns?})` | dietary, dress code, transport, rooming, weather | `string[]` |
| `ChipSingleSelect({options,value,onChange,allowClear?})` | food service style, decor style | `string \| null` |
| `PresetTagInput({suggestions,value,onChange,allowCustom?})` | cuisines, menu highlights, ceremony flow, palette words | `string[]` |
| `SwatchPalette({swatches,value,onChange})` | decor palette (visual swatches) | `string[]` |
| `Stepper({value,onChange,step,presets,suffix})` | guest counts, budget | `number` |
| `OwnerSelect({value,onChange})` | task owner | `string` |

Exported catalogs (option data): `FOOD_SERVICE_STYLES`, `CUISINE_OPTIONS`, `DIETARY_TAG_OPTIONS`,
`SIGNATURE_COUNTER_OPTIONS`, `DECOR_STYLE_OPTIONS`, `DECOR_PALETTES` (Swatch[]),
`DRESS_CODE_OPTIONS`, `TRANSPORT_OPTIONS`, `ROOMING_OPTIONS`, `WEATHER_BACKUP_OPTIONS`,
`CEREMONY_FLOW_OPTIONS`, `TASK_TEMPLATES`, `TASK_OWNER_OPTIONS`, `GUEST_PRESETS`.

### `src/components/dashboard/finalization-board.tsx` — interactive Layer 3
`<FinalizationBoard checks={checks} onResolve={onResolveCheck} />`. Progress ring,
ready/in-progress/open tallies, a smart **"Open next gap"** that jumps to the first non-ok check,
gap cards sorted worst-first, and an all-clear state at 100%. `FinalizationCheck` is structurally
identical to your `CheckResult` (`{key,label,description,status,detail}`), so you pass the result
of `computeFinalizationChecks(...)` straight in.

---

## 3. YOUR QUEUE (Codex) — wire interactivity into Layer 2 & 3

The user's directive: **"super interactivity… I don't [want] lots of typing for the users,"
especially Layer 2 and 3.** Layer 2 currently has ~15 free-text `<textarea>`s. Replace them.

### 3a. Layer 2 field → control mapping (`client/wedding/page.tsx`)
Find each field by its placeholder text (line numbers drift):

| Field (placeholder) | Replace with | Catalog |
|---|---|---|
| Guests (number input, Basics) | `Stepper` | `GUEST_PRESETS` (suffix "guests") |
| `foodStyle` `<select>` ("Buffet, plated…") | `ChipSingleSelect` | `FOOD_SERVICE_STYLES` |
| `foodPreferences` (already `string[]`, chip toggle exists) | `ChipMultiSelect` or `PresetTagInput` | `DIETARY_TAG_OPTIONS` + `CUISINE_OPTIONS` |
| Menu story ("Cuisine mix, guest diet…") textarea | `PresetTagInput` | `CUISINE_OPTIONS`, `SIGNATURE_COUNTER_OPTIONS` |
| Dish item ("Dish, counter, drink…") | `PresetTagInput` | `SIGNATURE_COUNTER_OPTIONS` |
| menu item `dietaryTags` (already `string[]`) | `ChipMultiSelect` | `DIETARY_TAG_OPTIONS` |
| `decorStyle` `<select>` | `ChipSingleSelect` | `DECOR_STYLE_OPTIONS` |
| Decor notes ("Stage mood, florals…") textarea | `SwatchPalette` + `PresetTagInput` | `DECOR_PALETTES` |
| Dress code ("Pastels, festive…") textarea (`attireNotes`) | `ChipMultiSelect` | `DRESS_CODE_OPTIONS` |
| Logistics transport ("Pickups, shuttle…") | `ChipMultiSelect` | `TRANSPORT_OPTIONS` |
| Logistics rooming ("Getting-ready rooms…") | `ChipMultiSelect` | `ROOMING_OPTIONS` |
| Weather plan ("Indoor move, tenting…") | `ChipMultiSelect` | `WEATHER_BACKUP_OPTIONS` |
| Ceremony ("Procession order, cue points…") | `PresetTagInput` (ordered) | `CEREMONY_FLOW_OPTIONS` |
| Task title ("Task title" input) | `PresetTagInput`/template pick | `TASK_TEMPLATES` |
| Task owner ("Owner" input) | `OwnerSelect` | `TASK_OWNER_OPTIONS` |

**Serialization decision (important):** `foodPreferences` and menu `dietaryTags` are already
`string[]` → direct swap, no API change. But `decorNotes`, `attireNotes`, and
`logistics.{transport_notes,rooming_notes,weather_plan,ceremony_notes}` are **scalar strings** in
the draft/API. Pick one:
- **(Recommended)** keep the column a string, serialize on save (`value.join(" · ")`) and split on
  load (`(s ?? "").split(" · ").filter(Boolean)`) — zero schema change. Wrap in a tiny
  `useArrayField(stringValue, setStringValue)` adapter so the chip controls stay array-based.
- Or migrate those columns to `text[]` (schema + API change — heavier).
Keep a single optional freeform textarea **only** for genuinely open notes (run-of-show / final
reminders); everything structured becomes chips.

### 3b. Layer 3 — mount the board
Replace the body of `FinalizationLayer` (or its call site at ~line 2485) with
`<FinalizationBoard checks={checks} onResolve={onResolveCheck} />`. Your existing
`resolveFinalizationCheck` already deep-links to the right layer+section, so it slots straight in.
Optional polish: make "Open next gap" target the first **non-ok** check (the board already does
this; just make sure `onResolve` handles every `check.key`).

### 3c. Planner bugs to check while you're in there
- Dead code: the `editorSection === "requirements"` render branch is unreachable (the Needs tab
  was removed) — delete it.
- Confirm the per-block needs filter still hides Food/Design/Logistics correctly after your big
  `1d1000d` planner rewrite (Claude verified it before that commit; please re-confirm).

---

## 4. Deeper observations (lower priority, shared)

- **`client/wedding/page.tsx` is 5,327 lines in one client component.** Consider extracting the
  editor sections (Basics/Food/Design/Vendors/Logistics/Tasks/Notes) into separate files. Big
  refactor — coordinate before starting so we don't both touch it.
- **Vendor selection**: keep pushing "select from shortlist, never type a vendor name" (user
  asked for this explicitly). The `VenuePicker` + shortlist selects are the right direction.
- **No budget typing**: Basics still has an `estimatedBudget` number input — per product
  direction Elysian *estimates* spend after planning. Consider making it read-only/derived, or at
  least a `Stepper`, not free typing.

---

## Previously shipped (context, already on main)
- `86c0b32` — per-block needs (onboarding chips → API seeds only chosen needs → editor hides
  unselected sections). Verified end-to-end before commit.
- `9224a91`/`9b4b109` — onboarding auto-create bug fixed (no `type="submit"` in that form — don't
  reintroduce one). `239cc93` — "Back to Site" fix. `e3f4ee1` — per-block guests, no budget entry.
