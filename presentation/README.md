# Internship Presentation

`Elysian-Celebrations-Internship.pptx` — a 15-slide deck covering the Elysian
Celebrations internship project. Open it in PowerPoint, Keynote or Google Slides.

## Fill these in before presenting

Three placeholders are deliberately left in the deck. Find and replace them:

| Placeholder | Appears on |
| --- | --- |
| `[ORGANISATION NAME]` | slide 1 |
| `[START DATE – END DATE]` | slide 1 |
| `[MENTOR NAME]` | slide 15 |
| `[COLLEGE NAME]` | slide 15 |

## Speaker notes

Every slide carries speaker notes written to be spoken aloud in roughly 35–45
seconds. Total runtime is about 10 minutes. In PowerPoint: **View → Notes Page**,
or use Presenter View.

## Slide map

| # | Slide | Layout |
| --- | --- | --- |
| 1 | Cover | Full-bleed dark, radial flow-map motif |
| 2 | Scope of work | Four big-number stat tiles + statement bar |
| 3 | The problem | Split screen: pain list / fragmented-tools visual |
| 4 | Product thesis | Dark manifesto statement + three principle cards |
| 5 | Three-layer model | Process sequence, three numbered cards |
| 6 | Layer 2 in detail | Four-column drill-down flow diagram |
| 7 | System shape | Hub-and-spoke, four portals around one spine |
| 8 | Architecture | Layered stack + trade-off callout |
| 9 | Data model | Big-number spotlight + column chart + phase list |
| 10 | Commercial logic | Four-step flow + role-visibility comparison |
| 11 | Engineering rigour | Audit coverage list + 2×2 outcome tiles |
| 12 | The hard bug | Before/after comparison + lesson bar |
| 13 | What's next | Three roadmap cards |
| 14 | What I learned | Dark, three numbered lesson rows |
| 15 | Closing | Dark, contact block |

## Design system

The deck reuses the product's own earth palette from `src/app/globals.css`, so
the slides and the application read as one brand.

- Dominant accent: saddle brown `#7F4F24`
- Dark neutral: charcoal brown `#333D29`
- Light neutral: ivory `#F5F0E2`
- Supporting tints: camel `#A68A64`, dusty olive `#656D4A`, dry sage `#A4AC86`

Headings are set in Cambria, body copy in Calibri — both ship with Office, so the
deck renders identically on any machine.

## Rebuilding

`build.js` regenerates the `.pptx` from scratch, including the background
gradients and vector motifs. Edit the copy or layout there rather than hand-editing
slides if you want changes to survive a rebuild.

```bash
npm install pptxgenjs sharp   # not part of the app's dependencies
node build.js
```

The script writes `Elysian-Celebrations-Internship.pptx` next to itself and drops
generated imagery in `assets/` (not committed).
