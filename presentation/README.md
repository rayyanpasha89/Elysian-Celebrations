# Internship Presentation

Presentation material for the TIPS Founder's Desk internship, built against the
Atria University Year-3 internship rubric.

| File | Use |
| --- | --- |
| `Elysian-Internship-Presentation.pptx` | **The deck to present.** 9 slides, paced for the rubric's 3–5 minute limit. |
| `Elysian-Internship-Extended.pptx` | 15-slide deep version. Backup for Q&A and for attaching to the final report. |
| `build.js` / `build-extended.js` | Regenerate either deck from scratch. |

Both decks are complete — no placeholders to fill in.

## Rubric mapping (final presentation, 40 marks)

| Criterion | Marks | Slides |
| --- | --- | --- |
| Content and Relevance — role, tasks, technologies used, outcomes | 15 | 1–6 |
| Communication Skills — delivery, pace, tone | 10 | speaker notes on every slide |
| Reflection and Insight — skills gained, challenges faced, academic learning applied, future goals | 15 | 7–8 |
| Time Management & Demo — completes smoothly within 3–5 minutes | 5 | 9 slides, ~4:15 budgeted |

## Timing

Speaker notes carry a per-slide budget. Total is about **4 minutes 15 seconds**,
sitting mid-range of the 3–5 minute window with room to breathe.

| # | Slide | Budget |
| --- | --- | --- |
| 1 | Cover | 10s |
| 2 | The role — six mandate areas | 30s |
| 3 | The problem | 25s |
| 4 | What I built | 35s |
| 5 | **Live demo** | 50s |
| 6 | Technologies used | 25s |
| 7 | Skills gained & challenges faced | 35s |
| 8 | Academic learning applied & future goals | 35s |
| 9 | Thank you | 10s |

## Live demo

Slide 5 is the demo cue card. Keep to three beats and then return to the deck:

1. **The flow map** — drill event hub → day → function → step.
2. **Vendor catalogue** — open a need and apply a catalogue row.
3. **Readiness gate** — show the client total held back until the function is complete.

Verify `elysiancelebrations.com` resolves and that you are logged in **before**
you present. If it fails, say so once and move on — slide 6 covers the stack
regardless. Never spend demo budget debugging in front of the panel.

## Design system

Both decks reuse the product's own earth palette from `src/app/globals.css`, so
the slides and the application read as one brand.

- Dominant accent: saddle brown `#7F4F24`
- Dark neutral: charcoal brown `#333D29`
- Light neutral: ivory `#F5F0E2`
- Supporting tints: camel `#A68A64`, dusty olive `#656D4A`, dry sage `#A4AC86`

Headings are Cambria, body copy Calibri — both ship with Office, so the decks
render identically on any machine. All visuals are vector diagrams and one native
PowerPoint chart; there are no external image dependencies.

## Rebuilding

Edit copy and layout in the generators rather than hand-editing slides, so changes
survive a rebuild.

```bash
npm install pptxgenjs sharp   # not part of the app's dependencies
node build.js                 # the 3–5 minute deck
node build-extended.js        # the 15-slide backup
```

Each script writes its `.pptx` alongside itself and drops generated imagery in
`assets/` (not committed).
