/* Elysian Celebrations — internship presentation generator */
const pptxgen = require("pptxgenjs");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const OUT = __dirname;
const ASSETS = path.join(OUT, "assets");
fs.mkdirSync(ASSETS, { recursive: true });

/* ---------------------------------------------------------------- palette */
const INK = "333D29";      // charcoal brown  - dark neutral
const BONE = "F5F0E2";     // ivory           - light neutral
const CREAM = "EBE3CE";    // card tint on light
const BRAND = "7F4F24";    // saddle brown    - dominant accent
const CAMEL = "A68A64";
const OLIVE = "656D4A";
const SAGE = "A4AC86";
const KHAKI = "B6AD90";
const BONE_DIM = "BFC2AC"; // muted text on dark

const SERIF = "Cambria";
const SANS = "Calibri";

/* ------------------------------------------------------------ deck fields */
const ORG = "[ORGANISATION NAME]";
const COLLEGE = "[COLLEGE NAME]";
const MENTOR = "[MENTOR NAME]";
const DURATION = "[START DATE – END DATE]";
const STUDENT = "Rayyan Pasha";

/* ----------------------------------------------------------------- assets */
async function makeDarkBg(file, gx, gy, r) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2560" height="1440">
  <defs>
    <linearGradient id="b" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2C3423"/>
      <stop offset="52%" stop-color="#1F2618"/>
      <stop offset="100%" stop-color="#141810"/>
    </linearGradient>
    <radialGradient id="g" cx="${gx}" cy="${gy}" r="${r}">
      <stop offset="0%" stop-color="#A68A64" stop-opacity="0.40"/>
      <stop offset="42%" stop-color="#7F4F24" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#7F4F24" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="2560" height="1440" fill="url(#b)"/>
  <rect width="2560" height="1440" fill="url(#g)"/>
</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(path.join(ASSETS, file));
}

async function makeLightBg(file) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2560" height="1440">
  <defs>
    <radialGradient id="g" cx="0.92" cy="0.08" r="0.85">
      <stop offset="0%" stop-color="#E4DAC0" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#F5F0E2" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="2560" height="1440" fill="#F5F0E2"/>
  <rect width="2560" height="1440" fill="url(#g)"/>
</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(path.join(ASSETS, file));
}

/* radial flow-map motif echoing the product's CelebrationCanvas */
async function makeFlowMotif(file) {
  const cx = 700, cy = 700;
  const spokes = 6;
  let el = "";
  const dayR = 250, fnR = 470, stepR = 620;
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2 - Math.PI / 2;
    const dx = cx + Math.cos(a) * dayR, dy = cy + Math.sin(a) * dayR;
    el += `<line x1="${cx}" y1="${cy}" x2="${dx}" y2="${dy}" stroke="#A68A64" stroke-opacity="0.55" stroke-width="2.5"/>`;
    for (let j = -1; j <= 1; j++) {
      const a2 = a + j * 0.20;
      const fx = cx + Math.cos(a2) * fnR, fy = cy + Math.sin(a2) * fnR;
      el += `<line x1="${dx}" y1="${dy}" x2="${fx}" y2="${fy}" stroke="#A68A64" stroke-opacity="0.30" stroke-width="1.6"/>`;
      el += `<circle cx="${fx}" cy="${fy}" r="9" fill="#B6AD90" fill-opacity="0.75"/>`;
      const sx = cx + Math.cos(a2 + 0.07) * stepR, sy = cy + Math.sin(a2 + 0.07) * stepR;
      el += `<line x1="${fx}" y1="${fy}" x2="${sx}" y2="${sy}" stroke="#A68A64" stroke-opacity="0.16" stroke-width="1.2"/>`;
      el += `<circle cx="${sx}" cy="${sy}" r="5" fill="#A68A64" fill-opacity="0.5"/>`;
    }
    el += `<circle cx="${dx}" cy="${dy}" r="17" fill="#1F2618"/>`;
    el += `<circle cx="${dx}" cy="${dy}" r="17" fill="none" stroke="#A68A64" stroke-opacity="0.95" stroke-width="3"/>`;
  }
  const rings = [dayR, fnR, stepR]
    .map((r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#A68A64" stroke-opacity="0.13" stroke-width="1.4"/>`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1400">
  ${rings}${el}
  <circle cx="${cx}" cy="${cy}" r="52" fill="#7F4F24"/>
  <circle cx="${cx}" cy="${cy}" r="52" fill="none" stroke="#A68A64" stroke-width="3"/>
  <circle cx="${cx}" cy="${cy}" r="20" fill="#F5F0E2" fill-opacity="0.9"/>
</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(path.join(ASSETS, file));
}

/* fragmented-tools motif for the problem slide */
async function makeFragmentMotif(file) {
  const cards = [
    { x: 40, y: 60, r: -8, label: "GUESTS" },
    { x: 330, y: 20, r: 6, label: "MENU" },
    { x: 610, y: 96, r: -4, label: "VENDORS" },
    { x: 90, y: 300, r: 5, label: "BUDGET" },
    { x: 385, y: 268, r: -7, label: "TIMELINE" },
    { x: 650, y: 340, r: 9, label: "VENUE" },
  ];
  const el = cards
    .map(
      (c) => `<g transform="translate(${c.x},${c.y}) rotate(${c.r})">
      <rect width="248" height="150" rx="14" fill="#FFFFFF" fill-opacity="0.66" stroke="#B6AD90" stroke-width="2"/>
      <text x="20" y="40" font-family="Calibri,Arial" font-size="20" font-weight="700" fill="#7F4F24" letter-spacing="2">${c.label}</text>
      <rect x="20" y="62" width="190" height="9" rx="4.5" fill="#C9C7B4"/>
      <rect x="20" y="84" width="150" height="9" rx="4.5" fill="#D6D3C1"/>
      <rect x="20" y="106" width="172" height="9" rx="4.5" fill="#DEDBCB"/>
    </g>`
    )
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540">${el}</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(path.join(ASSETS, file));
}

/* ---------------------------------------------------------------- helpers */
const sh = (o = {}) => ({
  type: "outer", color: "1F2618", blur: 14, offset: 3, angle: 90, opacity: 0.13, ...o,
});

function eyebrow(slide, txt, onDark) {
  slide.addText(txt, {
    x: 0.75, y: 0.44, w: 11.83, h: 0.26, margin: 0,
    fontFace: SANS, fontSize: 10.5, bold: true, charSpacing: 2.6,
    color: onDark ? CAMEL : BRAND,
  });
}

function title(slide, txt, onDark, h = 1.02) {
  slide.addText(txt, {
    x: 0.75, y: 0.78, w: 11.5, h, margin: 0,
    fontFace: SERIF, fontSize: 30, bold: true, lineSpacingMultiple: 1.02,
    color: onDark ? BONE : INK, valign: "top",
  });
}

function subline(slide, txt, onDark, y = 1.86) {
  slide.addText(txt, {
    x: 0.75, y, w: 11.2, h: 0.34, margin: 0,
    fontFace: SANS, fontSize: 13.5, italic: true,
    color: onDark ? BONE_DIM : OLIVE,
  });
}

function card(slide, o) {
  slide.addShape("roundRect", {
    x: o.x, y: o.y, w: o.w, h: o.h, rectRadius: o.radius || 0.1,
    fill: { color: o.fill || "FFFFFF" },
    line: { color: o.lineColor || KHAKI, width: o.lineWidth === undefined ? 0.75 : o.lineWidth },
    shadow: o.shadow === false ? undefined : sh(o.shadowOpts),
  });
}

function badge(slide, o) {
  slide.addShape("ellipse", {
    x: o.x, y: o.y, w: o.d, h: o.d,
    fill: { color: o.fill || BRAND }, line: { color: o.fill || BRAND, width: 0 },
  });
  slide.addText(o.text, {
    x: o.x, y: o.y, w: o.d, h: o.d, margin: 0,
    fontFace: SANS, fontSize: o.size || 12, bold: true,
    color: o.color || BONE, align: "center", valign: "middle",
  });
}

function connect(slide, x1, y1, x2, y2, color = KHAKI, width = 1.25) {
  slide.addShape("line", {
    x: Math.min(x1, x2), y: Math.min(y1, y2),
    w: Math.abs(x2 - x1), h: Math.abs(y2 - y1),
    line: { color, width, endArrowType: "none" },
    flipH: x2 < x1, flipV: y2 < y1,
  });
}

/* ------------------------------------------------------------------ build */
async function main() {
  await makeDarkBg("bg-dark-a.png", 0.74, 0.30, 0.72);
  await makeDarkBg("bg-dark-b.png", 0.18, 0.82, 0.78);
  await makeDarkBg("bg-dark-c.png", 0.50, 0.14, 0.86);
  await makeLightBg("bg-light.png");
  await makeFlowMotif("motif-flow.png");
  await makeFragmentMotif("motif-fragments.png");

  const A = (f) => ({ path: path.join(ASSETS, f) });
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
  pres.author = STUDENT;
  pres.title = "Elysian Celebrations — Internship Presentation";

  const darkA = () => { const s = pres.addSlide(); s.background = A("bg-dark-a.png"); return s; };
  const darkB = () => { const s = pres.addSlide(); s.background = A("bg-dark-b.png"); return s; };
  const darkC = () => { const s = pres.addSlide(); s.background = A("bg-dark-c.png"); return s; };
  const light = () => { const s = pres.addSlide(); s.background = A("bg-light.png"); return s; };

  /* ============================================================= 1 · cover */
  {
    const s = darkA();
    s.addImage({ ...A("motif-flow.png"), x: 7.55, y: 0.30, w: 6.9, h: 6.9, transparency: 22 });

    s.addText("INTERNSHIP PROJECT PRESENTATION", {
      x: 0.85, y: 1.42, w: 7.2, h: 0.28, margin: 0,
      fontFace: SANS, fontSize: 11, bold: true, charSpacing: 3, color: CAMEL,
    });
    s.addText("Elysian\nCelebrations", {
      x: 0.85, y: 1.86, w: 7.2, h: 2.16, margin: 0,
      fontFace: SERIF, fontSize: 54, bold: true, color: BONE, lineSpacingMultiple: 0.96,
    });
    s.addText("Turning a wedding website into an event-planning platform.", {
      x: 0.85, y: 4.12, w: 6.9, h: 0.42, margin: 0,
      fontFace: SANS, fontSize: 16, italic: true, color: KHAKI,
    });

    const meta = [
      ["PRESENTED BY", STUDENT],
      ["ORGANISATION", ORG],
      ["DURATION", DURATION],
    ];
    meta.forEach(([k, v], i) => {
      const x = 0.85 + i * 2.45;
      s.addText(k, {
        x, y: 5.32, w: 2.3, h: 0.24, margin: 0,
        fontFace: SANS, fontSize: 9, bold: true, charSpacing: 2, color: OLIVE,
      });
      s.addText(v, {
        x, y: 5.60, w: 2.4, h: 0.32, margin: 0,
        fontFace: SANS, fontSize: 12.5, bold: true, color: BONE,
      });
    });
    s.addText("Next.js 16  ·  React 19  ·  TypeScript  ·  Supabase Postgres  ·  Clerk  ·  Vercel", {
      x: 0.85, y: 6.42, w: 7.4, h: 0.3, margin: 0,
      fontFace: SANS, fontSize: 11, color: BONE_DIM, charSpacing: 0.6,
    });
    s.addNotes(
      "Good morning. Over my internship at " + ORG + " I built Elysian Celebrations. " +
      "It started as a wedding website brief, and the most important thing I did was recognise " +
      "it shouldn't stay one. Today I'll show you what I built, the architecture underneath it, " +
      "and — honestly — what's still unfinished."
    );
  }

  /* ====================================================== 2 · at a glance */
  {
    const s = light();
    eyebrow(s, "01 · SCOPE OF WORK");
    title(s, "One codebase, every layer of a real product.");
    subline(s, "Not a prototype and not a tutorial build — a deployed, role-aware platform with its own schema, security model and commercial rules.");

    const stats = [
      ["61,000+", "lines of\nTypeScript", "strict mode, zero `any`", 31],
      ["62", "application\nroutes", "across 4 role portals", 40],
      ["59", "API route\nhandlers", "the full security boundary", 40],
      ["27", "Postgres\ntables", "via 25 reviewed migrations", 40],
    ];
    const w = 2.718, gap = 0.32;
    stats.forEach(([big, lbl, foot, fs], i) => {
      const x = 0.75 + i * (w + gap);
      card(s, { x, y: 2.46, w, h: 2.06, fill: "FFFFFF" });
      s.addText(big, {
        x: x + 0.24, y: 2.64, w: w - 0.48, h: 0.82, margin: 0,
        fontFace: SERIF, fontSize: fs, bold: true, color: BRAND, valign: "middle",
      });
      s.addText(lbl, {
        x: x + 0.24, y: 3.48, w: w - 0.48, h: 0.62, margin: 0,
        fontFace: SANS, fontSize: 13, bold: true, color: INK, lineSpacingMultiple: 0.94,
      });
      s.addText(foot, {
        x: x + 0.24, y: 4.10, w: w - 0.48, h: 0.3, margin: 0,
        fontFace: SANS, fontSize: 10, italic: true, color: OLIVE,
      });
    });

    card(s, { x: 0.75, y: 4.86, w: 11.833, h: 1.68, fill: INK, lineColor: INK, radius: 0.09 });
    s.addText("The brief was “build a wedding website”.", {
      x: 1.15, y: 5.10, w: 6.3, h: 0.4, margin: 0,
      fontFace: SANS, fontSize: 13, color: KHAKI,
    });
    s.addText("What the users actually needed was an operating system for multi-day events.", {
      x: 1.15, y: 5.52, w: 8.9, h: 0.76, margin: 0,
      fontFace: SERIF, fontSize: 20, bold: true, color: BONE, lineSpacingMultiple: 0.98,
    });
    s.addNotes(
      "To frame the scale: 61,000 lines of strict TypeScript, 62 routes, 59 API handlers, 27 tables. " +
      "But the number that matters is none of those — it's the gap between the brief I was given and " +
      "the problem I found."
    );
  }

  /* ========================================================= 3 · problem */
  {
    const s = light();
    eyebrow(s, "02 · THE PROBLEM");
    title(s, "A five-day celebration still runs on\nspreadsheets, phone calls and memory.");

    const pains = [
      ["Nothing is connected", "The guest count lives in a sheet, the menu in a chat, the budget in someone's head. Change one and the rest silently go stale."],
      ["Everything is free text", "Vendor names are typed, not chosen. Two spellings of one caterer become two vendors, and no system can price either."],
      ["Cost arrives last", "Clients are asked for a budget before anyone knows what the event even contains — so the number is fiction from day one."],
      ["No one can see readiness", "“Are we ready for Day 3?” has no answer short of calling six people."],
    ];
    let y = 2.36;
    pains.forEach(([h, b], i) => {
      badge(s, { x: 0.75, y: y + 0.04, d: 0.34, text: String(i + 1), size: 11.5 });
      s.addText(h, {
        x: 1.24, y, w: 4.5, h: 0.3, margin: 0,
        fontFace: SANS, fontSize: 14, bold: true, color: INK,
      });
      s.addText(b, {
        x: 1.24, y: y + 0.32, w: 4.62, h: 0.74, margin: 0,
        fontFace: SANS, fontSize: 11.5, color: OLIVE, lineSpacingMultiple: 1.04,
      });
      y += 1.17;
    });

    s.addImage({ ...A("motif-fragments.png"), x: 6.62, y: 2.30, w: 5.96, h: 3.35 });
    card(s, { x: 6.62, y: 5.96, w: 5.96, h: 0.88, fill: CREAM, lineColor: KHAKI });
    s.addText("Six tools that never speak to each other — and one client expected to be the integration layer.", {
      x: 6.92, y: 6.04, w: 5.36, h: 0.72, margin: 0,
      fontFace: SANS, fontSize: 12, italic: true, color: INK, valign: "middle",
    });
    s.addNotes(
      "Planning a multi-day Indian celebration means twenty-plus functions across five days. " +
      "Today that's coordinated across six disconnected tools, and the client is the integration layer. " +
      "Every one of these four problems became a design constraint."
    );
  }

  /* ========================================================== 4 · thesis */
  {
    const s = darkB();
    eyebrow(s, "03 · PRODUCT THESIS", true);
    s.addText("Tap first.\nType only when you must.", {
      x: 0.85, y: 1.42, w: 8.4, h: 2.1, margin: 0,
      fontFace: SERIF, fontSize: 44, bold: true, color: BONE, lineSpacingMultiple: 1.0,
    });
    s.addText("Every free-text field is a place the system stops understanding the user. So I removed them wherever a real catalogue could take their place.", {
      x: 0.85, y: 3.56, w: 7.9, h: 0.8, margin: 0,
      fontFace: SANS, fontSize: 15, italic: true, color: KHAKI, lineSpacingMultiple: 1.06,
    });

    const rules = [
      ["Curated over blank", "Event types, time blocks and requirement categories are presets. The user recognises, they don't recall."],
      ["Vendors are chosen, never typed", "Selection happens inside the need it belongs to, from a real catalogue of what that vendor actually offers."],
      ["Estimates admit uncertainty", "Custom requests are quarantined as “manual pricing needed” instead of being silently guessed."],
    ];
    const w = 3.644, gap = 0.45;
    rules.forEach(([h, b], i) => {
      const x = 0.75 + i * (w + gap);
      card(s, { x, y: 4.72, w, h: 2.06, fill: "2B331F", lineColor: "4A5138", lineWidth: 1, shadow: false });
      badge(s, { x: x + 0.28, y: 4.98, d: 0.36, text: String(i + 1), fill: CAMEL, color: INK, size: 12 });
      s.addText(h, {
        x: x + 0.72, y: 4.90, w: w - 1.0, h: 0.52, margin: 0,
        fontFace: SANS, fontSize: 13, bold: true, color: BONE, valign: "middle",
      });
      s.addText(b, {
        x: x + 0.28, y: 5.50, w: w - 0.56, h: 1.1, margin: 0,
        fontFace: SANS, fontSize: 11, color: BONE_DIM, lineSpacingMultiple: 1.06,
      });
    });
    s.addNotes(
      "This one sentence drove every screen. If the user is typing, the system has stopped understanding them. " +
      "A typed vendor name is a dead end — it can't be priced, booked or reported on. A chosen one is a foreign key."
    );
  }

  /* ==================================================== 5 · three layers */
  {
    const s = light();
    eyebrow(s, "04 · THE MODEL");
    title(s, "One flow, three layers: define, map, finalize.");
    subline(s, "Each layer only asks for what the previous one has already made knowable.");

    const layers = [
      ["01", "DEFINITION", "Shape the event before any form appears.",
        ["Event type, number of days, dates", "Morning / afternoon / evening blocks", "Requirement needs per function"],
        "No budget field here — Elysian estimates cost after the plan exists, not before."],
      ["02", "FLOW MAP", "Edit one scoped part of the event at a time.",
        ["Event hub → days → functions → steps", "Venue and vendor pickers per need", "Six nodes per page, so 14 days stay legible"],
        "The board is the product. Open a step, and exactly one editor mounts."],
      ["03", "FINALIZATION", "Expose the gaps instead of summarising them.",
        ["Definition, requirements, vendors", "Budget, guests, hotels", "Run-of-show readiness"],
        "Every gap links back to the exact function that caused it."],
    ];
    const w = 3.644, gap = 0.45;
    layers.forEach(([num, name, tag, bullets, foot], i) => {
      const x = 0.75 + i * (w + gap);
      card(s, { x, y: 2.34, w, h: 4.2, fill: "FFFFFF" });
      badge(s, { x: x + 0.3, y: 2.6, d: 0.44, text: num, size: 13 });
      s.addText(name, {
        x: x + 0.86, y: 2.66, w: w - 1.16, h: 0.32, margin: 0,
        fontFace: SANS, fontSize: 12, bold: true, charSpacing: 2, color: BRAND, valign: "middle",
      });
      s.addText(tag, {
        x: x + 0.3, y: 3.20, w: w - 0.6, h: 0.66, margin: 0,
        fontFace: SERIF, fontSize: 16, bold: true, color: INK, lineSpacingMultiple: 1.0,
      });
      s.addText(
        bullets.map((t, k) => ({ text: t, options: { bullet: true, breakLine: k < bullets.length - 1 } })),
        {
          x: x + 0.34, y: 3.94, w: w - 0.66, h: 1.3, margin: 0,
          fontFace: SANS, fontSize: 11, color: OLIVE, paraSpaceAfter: 6, lineSpacingMultiple: 1.02,
        }
      );
      card(s, { x: x + 0.3, y: 5.44, w: w - 0.6, h: 0.9, fill: CREAM, lineColor: CREAM, shadow: false, radius: 0.07 });
      s.addText(foot, {
        x: x + 0.44, y: 5.5, w: w - 0.88, h: 0.78, margin: 0,
        fontFace: SANS, fontSize: 10.5, italic: true, color: INK, valign: "middle", lineSpacingMultiple: 1.02,
      });
      if (i < 2) {
        s.addShape("triangle", {
          x: x + w + 0.13, y: 4.28, w: 0.2, h: 0.24,
          fill: { color: CAMEL }, line: { color: CAMEL, width: 0 }, rotate: 90,
        });
      }
    });
    s.addNotes(
      "Three layers. Definition shapes the event. The flow map is where the real work happens. " +
      "Finalization checks readiness. The rule that ties them together: each layer only asks for " +
      "what the previous one has made knowable — which is why there's no budget question in Definition."
    );
  }

  /* ======================================================= 6 · flow map */
  {
    const s = light();
    eyebrow(s, "05 · LAYER 2 IN DETAIL");
    title(s, "The flow map replaced the form.");
    subline(s, "Drilling down narrows the scope — so the editor that finally opens is small enough to finish.");

    const hub = { x: 0.75, y: 3.66, w: 1.92, h: 1.16 };
    card(s, { ...hub, fill: BRAND, lineColor: BRAND, radius: 0.09 });
    s.addText("EVENT HUB", {
      x: hub.x, y: hub.y + 0.20, w: hub.w, h: 0.24, margin: 0,
      fontFace: SANS, fontSize: 9, bold: true, charSpacing: 1.6, color: KHAKI, align: "center",
    });
    s.addText("Reception\n& Sangeet", {
      x: hub.x, y: hub.y + 0.44, w: hub.w, h: 0.56, margin: 0,
      fontFace: SANS, fontSize: 12.5, bold: true, color: BONE, align: "center", lineSpacingMultiple: 0.95,
    });

    const colX = [3.18, 5.94, 9.02];
    const rowY = [2.44, 3.79, 5.14];

    // days
    const days = [["Day 1", "14 Mar · Fri"], ["Day 2", "15 Mar · Sat"], ["Day 3", "16 Mar · Sun"]];
    days.forEach(([d, sub], i) => {
      const act = i === 1;
      connect(s, hub.x + hub.w, hub.y + hub.h / 2, colX[0], rowY[i] + 0.44, act ? BRAND : KHAKI, act ? 2 : 1);
      card(s, { x: colX[0], y: rowY[i], w: 2.2, h: 0.88, fill: act ? INK : "FFFFFF", lineColor: act ? INK : KHAKI, radius: 0.08 });
      s.addText(d, {
        x: colX[0] + 0.18, y: rowY[i] + 0.14, w: 1.84, h: 0.28, margin: 0,
        fontFace: SANS, fontSize: 12.5, bold: true, color: act ? BONE : INK,
      });
      s.addText(sub, {
        x: colX[0] + 0.18, y: rowY[i] + 0.44, w: 1.84, h: 0.26, margin: 0,
        fontFace: SANS, fontSize: 10, color: act ? KHAKI : OLIVE,
      });
    });

    // functions of day 2
    const fns = [["Haldi", "10:00 · Garden Lawn · 120"], ["Lunch", "13:00 · Banquet · 240"], ["Sangeet", "19:30 · Ballroom · 300"]];
    fns.forEach(([f, sub], i) => {
      const act = i === 2;
      connect(s, colX[0] + 2.2, rowY[1] + 0.44, colX[1], rowY[i] + 0.44, act ? BRAND : KHAKI, act ? 2 : 1);
      card(s, { x: colX[1], y: rowY[i], w: 2.72, h: 0.88, fill: act ? INK : "FFFFFF", lineColor: act ? INK : KHAKI, radius: 0.08 });
      s.addText(f, {
        x: colX[1] + 0.2, y: rowY[i] + 0.13, w: 2.32, h: 0.28, margin: 0,
        fontFace: SANS, fontSize: 12.5, bold: true, color: act ? BONE : INK,
      });
      s.addText(sub, {
        x: colX[1] + 0.2, y: rowY[i] + 0.44, w: 2.36, h: 0.26, margin: 0,
        fontFace: SANS, fontSize: 9.5, color: act ? KHAKI : OLIVE,
      });
    });

    // step tokens
    const steps = [["Basics", SAGE], ["Food", SAGE], ["Design", CAMEL], ["Vendors", CAMEL], ["Logistics", KHAKI], ["Notes", KHAKI]];
    s.addText("STEPS OF THIS FUNCTION", {
      x: colX[2], y: 2.16, w: 3.3, h: 0.24, margin: 0,
      fontFace: SANS, fontSize: 9, bold: true, charSpacing: 1.6, color: BRAND,
    });
    steps.forEach(([t, c], i) => {
      const cx = colX[2] + (i % 2) * 1.72;
      const cy = 2.5 + Math.floor(i / 2) * 0.72;
      if (i === 0) connect(s, colX[1] + 2.72, rowY[2] + 0.44, colX[2], 4.2, BRAND, 2);
      card(s, { x: cx, y: cy, w: 1.56, h: 0.56, fill: "FFFFFF", lineColor: c, lineWidth: 1.5, radius: 0.28, shadow: false });
      s.addShape("ellipse", { x: cx + 0.16, y: cy + 0.2, w: 0.16, h: 0.16, fill: { color: c }, line: { color: c, width: 0 } });
      s.addText(t, {
        x: cx + 0.38, y: cy, w: 1.1, h: 0.56, margin: 0,
        fontFace: SANS, fontSize: 10.5, bold: true, color: INK, valign: "middle",
      });
    });
    card(s, { x: colX[2], y: 4.72, w: 3.28, h: 1.62, fill: CREAM, lineColor: KHAKI, radius: 0.08 });
    s.addText("Readiness is scored server-side", {
      x: colX[2] + 0.22, y: 4.88, w: 2.9, h: 0.28, margin: 0,
      fontFace: SANS, fontSize: 11.5, bold: true, color: INK,
    });
    s.addText("One contract scores every function and decides whether a price may be shown at all — the UI never gets its own opinion.", {
      x: colX[2] + 0.22, y: 5.22, w: 2.9, h: 1.0, margin: 0,
      fontFace: SANS, fontSize: 10.5, color: OLIVE, lineSpacingMultiple: 1.04,
    });
    s.addNotes(
      "This is the screen I'm proudest of. Instead of one enormous form, the user drills: hub, day, " +
      "function, step. By the time an editor opens it's scoped to one step of one function of one day — " +
      "small enough to actually finish. The highlighted path is the drill-down."
    );
  }

  /* ========================================================= 7 · portals */
  {
    const s = light();
    eyebrow(s, "06 · SYSTEM SHAPE");
    title(s, "Four audiences, one source of truth.");
    subline(s, "Same event, four different questions — and four different sets of facts each role is allowed to see.");

    const centre = { x: 4.87, y: 3.72, w: 3.6, h: 1.62 };
    const quad = [
      { x: 0.75, y: 2.24, key: "CLIENT", n: "11 routes", d: "Define the event, map functions, choose venues and vendors, track spend and guests." },
      { x: 8.98, y: 2.24, key: "VENDOR", n: "11 routes", d: "Build real catalogue offerings with media, manage bookings, calendar and reviews." },
      { x: 0.75, y: 5.28, key: "MANAGER", n: "10 routes", d: "Operate live events across clients — bookings, inquiries, destinations, configurator." },
      { x: 8.98, y: 5.28, key: "ADMIN", n: "15 routes", d: "Own pricing, venues, vendors, packages, revenue and every published commercial total." },
    ];
    quad.forEach((q) => {
      card(s, { x: q.x, y: q.y, w: 3.6, h: 1.48, fill: "FFFFFF" });
      s.addText(q.key, {
        x: q.x + 0.26, y: q.y + 0.18, w: 2.1, h: 0.3, margin: 0,
        fontFace: SANS, fontSize: 12.5, bold: true, charSpacing: 2, color: BRAND,
      });
      s.addText(q.n, {
        x: q.x + 1.9, y: q.y + 0.18, w: 1.46, h: 0.3, margin: 0,
        fontFace: SANS, fontSize: 10.5, bold: true, color: OLIVE, align: "right",
      });
      s.addText(q.d, {
        x: q.x + 0.26, y: q.y + 0.56, w: 3.1, h: 0.82, margin: 0,
        fontFace: SANS, fontSize: 11, color: INK, lineSpacingMultiple: 1.04,
      });
      const fromX = q.x < 4 ? q.x + 3.6 : q.x;
      const toX = q.x < 4 ? centre.x : centre.x + centre.w;
      connect(s, fromX, q.y + 0.74, toX, centre.y + centre.h / 2, KHAKI, 1.25);
    });

    card(s, { ...centre, fill: INK, lineColor: INK, radius: 0.09 });
    s.addText("ONE EVENT SPINE", {
      x: centre.x, y: centre.y + 0.22, w: centre.w, h: 0.26, margin: 0,
      fontFace: SANS, fontSize: 9.5, bold: true, charSpacing: 2.2, color: CAMEL, align: "center",
    });
    s.addText("27 tables · 59 endpoints", {
      x: centre.x, y: centre.y + 0.54, w: centre.w, h: 0.36, margin: 0,
      fontFace: SERIF, fontSize: 17, bold: true, color: BONE, align: "center",
    });
    s.addText("Roles are enforced server-side, not in the UI", {
      x: centre.x + 0.2, y: centre.y + 0.96, w: centre.w - 0.4, h: 0.44, margin: 0,
      fontFace: SANS, fontSize: 10, italic: true, color: KHAKI, align: "center",
    });
    s.addNotes(
      "Four portals, 62 routes, one shared spine. The design decision worth noting: none of these " +
      "portals is a separate application. They read the same tables through the same handlers — the " +
      "difference is purely what each role is authorised to see."
    );
  }

  /* ==================================================== 8 · architecture */
  {
    const s = light();
    eyebrow(s, "07 · ARCHITECTURE");
    title(s, "Every API route is the security boundary — on purpose.");
    subline(s, "The browser can never reach Postgres. That is a deliberate trade, and it comes with a cost I had to own.");

    const stack = [
      ["CLIENT", "Next.js 16 App Router · React 19 · Tailwind v4", "62 pages across marketing, auth and four dashboards", BONE, INK, KHAKI],
      ["IDENTITY", "Clerk authentication + webhook role sync", "Supabase role state is authoritative; Clerk metadata follows", "FFFFFF", INK, KHAKI],
      ["BOUNDARY", "59 server route handlers", "Ownership re-queried server-side — client IDs are never trusted", BRAND, BONE, BRAND],
      ["DATA", "Supabase Postgres + Storage", "RLS enabled with zero policies; all anon/authenticated grants revoked", INK, BONE, INK],
    ];
    let y = 2.42;
    stack.forEach(([tag, head, sub, fill, fg, ln]) => {
      card(s, { x: 0.75, y, w: 7.42, h: 0.98, fill, lineColor: ln, radius: 0.08 });
      s.addText(tag, {
        x: 0.98, y: y + 0.14, w: 1.5, h: 0.26, margin: 0,
        fontFace: SANS, fontSize: 9, bold: true, charSpacing: 1.8,
        color: fill === BRAND || fill === INK ? CAMEL : BRAND,
      });
      s.addText(head, {
        x: 0.98, y: y + 0.38, w: 6.1, h: 0.28, margin: 0,
        fontFace: SANS, fontSize: 13, bold: true, color: fg,
      });
      s.addText(sub, {
        x: 0.98, y: y + 0.66, w: 6.5, h: 0.26, margin: 0,
        fontFace: SANS, fontSize: 10, color: fill === BRAND || fill === INK ? KHAKI : OLIVE,
      });
      y += 1.1;
    });

    card(s, { x: 8.55, y: 2.42, w: 4.03, h: 4.06, fill: CREAM, lineColor: KHAKI });
    s.addText("THE TRADE-OFF", {
      x: 8.85, y: 2.68, w: 3.4, h: 0.26, margin: 0,
      fontFace: SANS, fontSize: 9.5, bold: true, charSpacing: 2, color: BRAND,
    });
    s.addText("There is no second line of defence.", {
      x: 8.85, y: 3.0, w: 3.44, h: 0.72, margin: 0,
      fontFace: SERIF, fontSize: 17, bold: true, color: INK, lineSpacingMultiple: 1.0,
    });
    s.addText(
      "Because every handler uses the service role, RLS cannot catch a mistake. " +
      "One missing ownership filter would be a cross-tenant leak.\n\n" +
      "So ownership is re-queried from the database on every scoped read and write, " +
      "and I audited all 59 handlers specifically for that filter.",
      {
        x: 8.85, y: 3.78, w: 3.44, h: 2.4, margin: 0,
        fontFace: SANS, fontSize: 11, color: INK, lineSpacingMultiple: 1.08,
      }
    );
    s.addNotes(
      "Architecturally the most consequential decision: the browser holds no database credentials at all. " +
      "RLS is on with zero policies and public grants revoked, so Postgres is reachable only through my " +
      "59 handlers. The honest cost is that RLS can no longer catch my mistakes — which is exactly why I audited for it."
    );
  }

  /* ========================================================== 9 · schema */
  {
    const s = light();
    eyebrow(s, "08 · DATA MODEL");
    title(s, "The schema changed 25 times — every change reviewed.");
    subline(s, "Migrations in version control, applied through a scripted remote workflow. No fixes typed into a dashboard.");

    card(s, { x: 0.75, y: 2.44, w: 4.34, h: 4.06, fill: INK, lineColor: INK });
    s.addText("25", {
      x: 1.05, y: 2.66, w: 3.7, h: 1.0, margin: 0,
      fontFace: SERIF, fontSize: 58, bold: true, color: CAMEL, valign: "middle",
    });
    s.addText("tracked migrations", {
      x: 1.05, y: 3.66, w: 3.7, h: 0.3, margin: 0,
      fontFace: SANS, fontSize: 13.5, bold: true, color: BONE,
    });
    const facts = [
      ["27", "tables under version control"],
      ["6", "months of continuous schema evolution"],
      ["0", "schema changes made outside a migration"],
    ];
    let fy = 4.24;
    facts.forEach(([n, t]) => {
      s.addText(n, {
        x: 1.05, y: fy, w: 0.72, h: 0.36, margin: 0,
        fontFace: SERIF, fontSize: 22, bold: true, color: SAGE,
      });
      s.addText(t, {
        x: 1.8, y: fy + 0.04, w: 2.98, h: 0.44, margin: 0,
        fontFace: SANS, fontSize: 11, color: KHAKI, lineSpacingMultiple: 1.0,
      });
      fy += 0.72;
    });

    s.addText("MIGRATIONS SHIPPED PER MONTH", {
      x: 5.52, y: 2.44, w: 5.2, h: 0.26, margin: 0,
      fontFace: SANS, fontSize: 9.5, bold: true, charSpacing: 2, color: BRAND,
    });
    s.addChart(
      "bar",
      [{ name: "Migrations", labels: ["Mar", "Apr", "May", "Jun", "Jul", "Aug"], values: [1, 3, 4, 7, 4, 6] }],
      {
        x: 5.32, y: 2.76, w: 7.26, h: 2.18,
        barDir: "col", barGapWidthPct: 62,
        chartColors: [BRAND],
        showTitle: false, showLegend: false,
        showValue: true, dataLabelPosition: "outEnd",
        dataLabelColor: INK, dataLabelFontFace: SANS, dataLabelFontSize: 11, dataLabelFontBold: true,
        catAxisLabelColor: OLIVE, catAxisLabelFontFace: SANS, catAxisLabelFontSize: 11,
        valAxisHidden: true, valAxisMaxVal: 8,
        catGridLine: { style: "none" }, valGridLine: { style: "none" },
        catAxisLineShow: false, valAxisLineShow: false,
        plotArea: { fill: { color: BONE } },
      }
    );

    const phases = [
      ["Baseline & roles", "Core schema, plus a manager role added without a rewrite."],
      ["Event platform layer", "Days, time blocks and requirement payloads."],
      ["Commercial model", "Vendor payout, flat fee and a generated final price."],
      ["Hardening wave", "Query-path indexes, identity history, payment validation."],
    ];
    let py = 5.14;
    phases.forEach(([h, b], i) => {
      badge(s, { x: 5.52, y: py + 0.02, d: 0.3, text: String(i + 1), size: 10.5 });
      s.addText(h, {
        x: 5.96, y: py - 0.02, w: 2.5, h: 0.28, margin: 0,
        fontFace: SANS, fontSize: 11.5, bold: true, color: INK, valign: "middle",
      });
      s.addText(b, {
        x: 8.5, y: py - 0.02, w: 4.08, h: 0.34, margin: 0,
        fontFace: SANS, fontSize: 10.5, color: OLIVE, valign: "middle",
      });
      py += 0.46;
    });
    s.addNotes(
      "25 migrations over six months. June is the spike — that's when the event-platform layer and " +
      "the commercial model both landed. The discipline point: not one schema change was typed into " +
      "the Supabase dashboard. Everything is a reviewed file in git."
    );
  }

  /* ====================================================== 10 · commercial */
  {
    const s = light();
    eyebrow(s, "09 · COMMERCIAL LOGIC");
    title(s, "Three roles, three different truths about one price.");
    subline(s, "Vendors never negotiate in-app. The rule is enforced by database constraints, not by hiding a button.");

    const steps = [
      ["Agreed offline", "Elysian and the vendor settle the event-specific price outside the product."],
      ["Admin records it", "One agreed vendor payout plus one flat Elysian fee, entered in /admin/pricing."],
      ["Postgres derives", "final_price = vendor_amount + service_fee, as a generated column."],
      ["Publish gate", "The client total appears only when the function reaches 100% readiness."],
    ];
    const w = 2.696, gap = 0.35;
    steps.forEach(([h, b], i) => {
      const x = 0.75 + i * (w + gap);
      card(s, { x, y: 2.34, w, h: 1.62, fill: "FFFFFF" });
      badge(s, { x: x + 0.24, y: 2.56, d: 0.34, text: String(i + 1), size: 11.5 });
      s.addText(h, {
        x: x + 0.66, y: 2.58, w: w - 0.9, h: 0.3, margin: 0,
        fontFace: SANS, fontSize: 12.5, bold: true, color: INK, valign: "middle",
      });
      s.addText(b, {
        x: x + 0.24, y: 3.02, w: w - 0.48, h: 0.82, margin: 0,
        fontFace: SANS, fontSize: 10.5, color: OLIVE, lineSpacingMultiple: 1.04,
      });
      if (i < 3) {
        s.addShape("triangle", {
          x: x + w + 0.08, y: 3.03, w: 0.19, h: 0.23,
          fill: { color: CAMEL }, line: { color: CAMEL, width: 0 }, rotate: 90,
        });
      }
    });

    s.addText("WHO IS ALLOWED TO SEE WHAT", {
      x: 0.75, y: 4.26, w: 6, h: 0.26, margin: 0,
      fontFace: SANS, fontSize: 9.5, bold: true, charSpacing: 2, color: BRAND,
    });
    const who = [
      ["VENDOR", "Their agreed payout — and nothing else.", "Never sees the fee or the client total.", SAGE],
      ["CLIENT", "The published final price only.", "Never sees the payout or the fee split.", CAMEL],
      ["ELYSIAN", "Payout, fee and final together.", "The only role with the full breakdown.", BRAND],
    ];
    const w2 = 3.678, gap2 = 0.4;
    who.forEach(([role, line1, line2, c], i) => {
      const x = 0.75 + i * (w2 + gap2);
      card(s, { x, y: 4.6, w: w2, h: 1.84, fill: i === 2 ? INK : "FFFFFF", lineColor: i === 2 ? INK : KHAKI });
      s.addShape("ellipse", { x: x + 0.28, y: 4.86, w: 0.2, h: 0.2, fill: { color: c }, line: { color: c, width: 0 } });
      s.addText(role, {
        x: x + 0.6, y: 4.78, w: w2 - 0.9, h: 0.3, margin: 0,
        fontFace: SANS, fontSize: 12, bold: true, charSpacing: 2,
        color: i === 2 ? CAMEL : BRAND, valign: "middle",
      });
      s.addText(line1, {
        x: x + 0.28, y: 5.2, w: w2 - 0.56, h: 0.54, margin: 0,
        fontFace: SANS, fontSize: 12.5, bold: true, color: i === 2 ? BONE : INK, lineSpacingMultiple: 1.02,
      });
      s.addText(line2, {
        x: x + 0.28, y: 5.78, w: w2 - 0.56, h: 0.5, margin: 0,
        fontFace: SANS, fontSize: 10.5, italic: true, color: i === 2 ? KHAKI : OLIVE, lineSpacingMultiple: 1.02,
      });
    });
    s.addNotes(
      "This was the hardest business logic. Three roles need three different truths about the same number. " +
      "The service fee is a generated column — final minus payout — so it cannot drift. And the client total " +
      "is gated behind 100% readiness, so nobody is quoted a price for a plan that isn't finished."
    );
  }

  /* ========================================================== 11 · audit */
  {
    const s = light();
    eyebrow(s, "10 · ENGINEERING RIGOUR");
    title(s, "I audited my own code, then shipped the fixes.");
    subline(s, "Two written audits — security and design — reviewed as evidence, not as a checklist to tick.");

    card(s, { x: 0.75, y: 2.42, w: 5.4, h: 4.06, fill: "FFFFFF" });
    s.addText("WHAT THE AUDIT COVERED", {
      x: 1.05, y: 2.68, w: 4.8, h: 0.26, margin: 0,
      fontFace: SANS, fontSize: 9.5, bold: true, charSpacing: 2, color: BRAND,
    });
    const covered = [
      ["All 59 route handlers", "read individually for ownership and authorisation gaps"],
      ["Dependency surface", "npm audit across the full production tree"],
      ["Schema & RLS migrations", "grants, policies, constraints and cascade behaviour"],
      ["Secret handling", "env layout, publishable vs service-role key separation"],
      ["Accessibility", "labels, focus management, keyboard paths, contrast"],
    ];
    let cy = 3.08;
    covered.forEach(([h, b]) => {
      s.addShape("ellipse", { x: 1.05, y: cy + 0.08, w: 0.15, h: 0.15, fill: { color: CAMEL }, line: { color: CAMEL, width: 0 } });
      s.addText(h, {
        x: 1.34, y: cy - 0.02, w: 4.5, h: 0.28, margin: 0,
        fontFace: SANS, fontSize: 12, bold: true, color: INK,
      });
      s.addText(b, {
        x: 1.34, y: cy + 0.26, w: 4.5, h: 0.3, margin: 0,
        fontFace: SANS, fontSize: 10.5, color: OLIVE,
      });
      cy += 0.66;
    });

    const tiles = [
      ["3 of 4", "HIGH findings closed", "payout leak, CVE surface, role authority", SAGE],
      ["0", "npm vulnerabilities", "after upgrading Next, PostCSS and Sharp", SAGE],
      ["1", "HIGH still open", "server-rendered role checks on dashboards", CAMEL],
      ["6", "dead dependencies removed", "GSAP, Zustand, dnd-kit, CVA and more", SAGE],
    ];
    const tw = 2.79, tgap = 0.4;
    tiles.forEach(([n, h, b, c], i) => {
      const x = 6.6 + (i % 2) * (tw + tgap);
      const y = 2.42 + Math.floor(i / 2) * 2.08;
      card(s, { x, y, w: tw, h: 1.98, fill: "FFFFFF" });
      s.addText(n, {
        x: x + 0.24, y: y + 0.2, w: tw - 0.48, h: 0.6, margin: 0,
        fontFace: SERIF, fontSize: 30, bold: true, color: c === SAGE ? BRAND : CAMEL, valign: "middle",
      });
      s.addText(h, {
        x: x + 0.24, y: y + 0.84, w: tw - 0.48, h: 0.52, margin: 0,
        fontFace: SANS, fontSize: 12.5, bold: true, color: INK, lineSpacingMultiple: 0.98,
      });
      s.addText(b, {
        x: x + 0.24, y: y + 1.38, w: tw - 0.48, h: 0.48, margin: 0,
        fontFace: SANS, fontSize: 10, italic: true, color: OLIVE, lineSpacingMultiple: 1.02,
      });
    });
    s.addNotes(
      "I want to be straight about this slide. I wrote two audits against my own code and I'm showing you " +
      "the open finding as well as the closed ones. One HIGH is still open — dashboards need a server-rendered " +
      "role check as defence in depth. The data is protected by the API checks today, but it isn't layered yet."
    );
  }

  /* ==================================================== 12 · case study */
  {
    const s = light();
    eyebrow(s, "11 · THE HARD BUG");
    title(s, "Two readiness rules disagreed — and one of them controlled money.");

    const panes = [
      {
        x: 0.75, w: 5.4, tag: "BEFORE", fill: "FFFFFF", tagColor: BRAND,
        head: "Readiness was computed twice.",
        body: "The planner scored a function in the browser. The pricing gate scored it again on the server, " +
          "with different rules.\n\nSo the progress ring could read 100% while the server disagreed — or worse, " +
          "agree when it shouldn't have. The gate that decides whether a client may see a final price was " +
          "resting on a number the UI had computed for itself.",
      },
      {
        x: 6.6, w: 5.98, tag: "AFTER", fill: CREAM, tagColor: BRAND,
        head: "One server-side contract, no UI opinion.",
        body: "Readiness and price visibility now come from a single server contract. The planner renders the " +
          "score; it never derives it.\n\nThe same pass removed the divergence in vendor discovery, which had " +
          "been reading a hardcoded wedding-only list instead of the plan's real requirement rows.",
      },
    ];
    panes.forEach((p) => {
      card(s, { x: p.x, y: 2.3, w: p.w, h: 3.16, fill: p.fill, lineColor: KHAKI });
      s.addText(p.tag, {
        x: p.x + 0.3, y: 2.54, w: 2, h: 0.26, margin: 0,
        fontFace: SANS, fontSize: 9.5, bold: true, charSpacing: 2.2, color: p.tagColor,
      });
      s.addText(p.head, {
        x: p.x + 0.3, y: 2.86, w: p.w - 0.6, h: 0.56, margin: 0,
        fontFace: SERIF, fontSize: 18, bold: true, color: INK, lineSpacingMultiple: 1.0,
      });
      s.addText(p.body, {
        x: p.x + 0.3, y: 3.5, w: p.w - 0.6, h: 1.76, margin: 0,
        fontFace: SANS, fontSize: 11.5, color: INK, lineSpacingMultiple: 1.08,
      });
    });

    card(s, { x: 0.75, y: 5.7, w: 11.833, h: 1.1, fill: INK, lineColor: INK, radius: 0.09 });
    s.addText("THE LESSON", {
      x: 1.15, y: 5.92, w: 1.5, h: 0.26, margin: 0,
      fontFace: SANS, fontSize: 9.5, bold: true, charSpacing: 2, color: CAMEL,
    });
    s.addText("Duplicated business logic isn't a code smell. When one copy guards money, it's a security bug waiting for a rounding difference.", {
      x: 2.85, y: 5.86, w: 9.4, h: 0.78, margin: 0,
      fontFace: SERIF, fontSize: 16, bold: true, color: BONE, valign: "middle", lineSpacingMultiple: 1.0,
    });
    s.addNotes(
      "If you ask me one technical question, ask about this. Readiness was calculated in two places with " +
      "divergent rules, and one of those copies decided whether a client could see a price. I collapsed it to " +
      "a single server-side contract. The lesson generalises: duplicated logic near money is a security problem, not a tidiness problem."
    );
  }

  /* ========================================================= 13 · next up */
  {
    const s = light();
    eyebrow(s, "12 · WHAT'S NEXT");
    title(s, "The next wave is architecture, not features.");
    subline(s, "These are deliberately unfinished — each needs a data migration, not a patch. Shipping them as “done” would have been the real failure.");

    const next = [
      ["Transaction boundaries", "Event creation writes to several tables with no transaction. A failure halfway through is compensated in application code, not rolled back.",
        "Move the full save into reviewed Postgres RPCs so rollback is guaranteed."],
      ["Split the money ledger", "One paid_amount column currently serves two opposite flows — what the client pays in, and what the vendor is paid out.",
        "Separate client receipts from vendor payouts before the data gets harder to untangle."],
      ["Decompose the planner", "The client planner is a single 6,244-line client component; 42 of 62 pages fetch through useEffect.",
        "Move stable reads server-side without losing the radial interaction model."],
    ];
    const w = 3.644, gap = 0.45;
    next.forEach(([h, prob, fix], i) => {
      const x = 0.75 + i * (w + gap);
      card(s, { x, y: 2.5, w, h: 3.94, fill: "FFFFFF" });
      badge(s, { x: x + 0.3, y: 2.76, d: 0.42, text: String(i + 1), size: 13 });
      s.addText(h, {
        x: x + 0.3, y: 3.34, w: w - 0.6, h: 0.6, margin: 0,
        fontFace: SERIF, fontSize: 17, bold: true, color: INK, lineSpacingMultiple: 1.0,
      });
      s.addText(prob, {
        x: x + 0.3, y: 4.0, w: w - 0.6, h: 1.16, margin: 0,
        fontFace: SANS, fontSize: 11, color: OLIVE, lineSpacingMultiple: 1.06,
      });
      card(s, { x: x + 0.3, y: 5.24, w: w - 0.6, h: 0.96, fill: CREAM, lineColor: CREAM, shadow: false, radius: 0.07 });
      s.addText(fix, {
        x: x + 0.44, y: 5.32, w: w - 0.88, h: 0.8, margin: 0,
        fontFace: SANS, fontSize: 10.5, italic: true, color: INK, valign: "middle", lineSpacingMultiple: 1.02,
      });
    });
    s.addNotes(
      "Three things I chose not to fake. Each needs a data migration rather than a patch, and shipping " +
      "chrome that implied they worked would have been worse than leaving them open. That judgement — " +
      "knowing when not to ship — is probably the most useful thing I learned."
    );
  }

  /* ========================================================= 14 · lessons */
  {
    const s = darkC();
    eyebrow(s, "13 · WHAT I LEARNED", true);
    title(s, "Three lessons I'll carry into every codebase.", true);

    const lessons = [
      ["Chrome that lies is a bug.", "I shipped surfaces that looked plan-aware over logic that never read the plan. A convincing empty state is worse than an honest error — it costs the user trust they can't get back."],
      ["Constraints belong in the database.", "Generated columns, partial unique indexes and check constraints enforce the commercial model even if my React code is wrong. Rules in components are suggestions."],
      ["Writing the audit taught me more than writing the feature.", "Reading all 59 of my own handlers for a single missing filter changed how I write the next one. Reviewing your own work adversarially is a skill, and it is learnable."],
    ];
    let y = 2.42;
    lessons.forEach(([h, b], i) => {
      card(s, { x: 0.75, y, w: 11.833, h: 1.38, fill: "2B331F", lineColor: "4A5138", lineWidth: 1, shadow: false, radius: 0.09 });
      badge(s, { x: 1.08, y: y + 0.44, d: 0.5, text: String(i + 1), fill: CAMEL, color: INK, size: 14 });
      s.addText(h, {
        x: 1.78, y: y + 0.41, w: 4.7, h: 0.56, margin: 0,
        fontFace: SERIF, fontSize: 19, bold: true, color: BONE, valign: "middle", lineSpacingMultiple: 0.98,
      });
      s.addText(b, {
        x: 6.62, y: y + 0.2, w: 5.66, h: 1.0, margin: 0,
        fontFace: SANS, fontSize: 11.5, color: BONE_DIM, valign: "middle", lineSpacingMultiple: 1.06,
      });
      y += 1.52;
    });
    s.addNotes(
      "Three lessons. The first is the one that stings — I built surfaces that implied features worked when " +
      "the logic behind them didn't. The second changed how I think about where rules live. The third is " +
      "the habit I'll keep: read your own code the way an attacker would."
    );
  }

  /* ========================================================= 15 · closing */
  {
    const s = darkA();
    s.addImage({ ...A("motif-flow.png"), x: 7.9, y: 0.55, w: 6.4, h: 6.4, transparency: 30 });

    s.addText("THANK YOU", {
      x: 0.85, y: 1.86, w: 7, h: 0.3, margin: 0,
      fontFace: SANS, fontSize: 11.5, bold: true, charSpacing: 3.2, color: CAMEL,
    });
    s.addText("Questions are\nwelcome.", {
      x: 0.85, y: 2.3, w: 7, h: 1.72, margin: 0,
      fontFace: SERIF, fontSize: 44, bold: true, color: BONE, lineSpacingMultiple: 0.98,
    });
    s.addText("Happy to walk through the flow map, the pricing constraints, or anything in the audit.", {
      x: 0.85, y: 4.12, w: 6.6, h: 0.6, margin: 0,
      fontFace: SANS, fontSize: 14, italic: true, color: KHAKI, lineSpacingMultiple: 1.04,
    });

    const contact = [
      ["STUDENT", STUDENT],
      ["MENTOR", MENTOR],
      ["INSTITUTION", COLLEGE],
    ];
    contact.forEach(([k, v], i) => {
      const y = 5.06 + i * 0.62;
      s.addText(k, {
        x: 0.85, y, w: 1.8, h: 0.28, margin: 0,
        fontFace: SANS, fontSize: 9, bold: true, charSpacing: 2, color: OLIVE, valign: "middle",
      });
      s.addText(v, {
        x: 2.75, y, w: 4.6, h: 0.28, margin: 0,
        fontFace: SANS, fontSize: 13, bold: true, color: BONE, valign: "middle",
      });
    });
    s.addNotes("Thank you. Happy to take questions — and I'd particularly welcome ones about the open items.");
  }

  const file = path.join(OUT, "Elysian-Celebrations-Internship.pptx");
  await pres.writeFile({ fileName: file });
  console.log("wrote", file);
}

main().catch((e) => { console.error(e); process.exit(1); });
