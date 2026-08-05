/* Elysian Celebrations — internship presentation (3–5 minute rubric format) */
const pptxgen = require("pptxgenjs");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const OUT = __dirname;
const ASSETS = path.join(OUT, "assets");
fs.mkdirSync(ASSETS, { recursive: true });

/* ---------------------------------------------------------------- palette */
const INK = "333D29";
const BONE = "F5F0E2";
const CREAM = "EBE3CE";
const BRAND = "7F4F24";
const CAMEL = "A68A64";
const OLIVE = "656D4A";
const SAGE = "A4AC86";
const KHAKI = "B6AD90";
const BONE_DIM = "BFC2AC";
const PANEL = "2B331F";
const PANEL_LN = "4A5138";

const SERIF = "Cambria";
const SANS = "Calibri";

/* ------------------------------------------------------------ deck fields */
const STUDENT = "Mohammed Rayyan Pasha";
const SID = "AU23UG-015";
const UNIV = "Atria University, Bengaluru";
const PROGRAMME = "Undergraduate Programme in Digital Transformation";
const ORG = "TIPS Founder's Desk · The Indian Public School, Bengaluru";
const MENTOR = "Padmini Raghavendra — Director & CEO";
const PERIOD = "01 April 2025 – 30 December 2026";
const SITE = "elysiancelebrations.com";

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

async function makeFlowMotif(file) {
  const cx = 700, cy = 700, spokes = 6;
  let el = "";
  const dayR = 250, fnR = 470, stepR = 620;
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2 - Math.PI / 2;
    const dx = cx + Math.cos(a) * dayR, dy = cy + Math.sin(a) * dayR;
    el += `<line x1="${cx}" y1="${cy}" x2="${dx}" y2="${dy}" stroke="#A68A64" stroke-opacity="0.55" stroke-width="2.5"/>`;
    for (let j = -1; j <= 1; j++) {
      const a2 = a + j * 0.2;
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

async function makeFragmentMotif(file) {
  const cards = [
    { x: 30, y: 40, r: -8, label: "GUESTS" },
    { x: 320, y: 14, r: 6, label: "MENU" },
    { x: 600, y: 78, r: -4, label: "VENDORS" },
    { x: 70, y: 262, r: 5, label: "BUDGET" },
    { x: 370, y: 234, r: -7, label: "TIMELINE" },
    { x: 640, y: 300, r: 9, label: "VENUE" },
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
  await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="960" height="480">${el}</svg>`))
    .png().toFile(path.join(ASSETS, file));
}

/* ---------------------------------------------------------------- helpers */
const sh = (o = {}) => ({ type: "outer", color: "1F2618", blur: 14, offset: 3, angle: 90, opacity: 0.13, ...o });

function eyebrow(slide, txt, onDark) {
  slide.addText(txt, {
    x: 0.75, y: 0.44, w: 11.83, h: 0.26, margin: 0,
    fontFace: SANS, fontSize: 10.5, bold: true, charSpacing: 2.6,
    color: onDark ? CAMEL : BRAND,
  });
}

function title(slide, txt, onDark, h = 1.02) {
  slide.addText(txt, {
    x: 0.75, y: 0.78, w: 11.6, h, margin: 0,
    fontFace: SERIF, fontSize: 29, bold: true, lineSpacingMultiple: 1.02,
    color: onDark ? BONE : INK, valign: "top",
  });
}

function subline(slide, txt, onDark, y = 1.9) {
  slide.addText(txt, {
    x: 0.75, y, w: 11.4, h: 0.34, margin: 0,
    fontFace: SANS, fontSize: 13, italic: true, color: onDark ? BONE_DIM : OLIVE,
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

function dot(slide, x, y, c, d = 0.16) {
  slide.addShape("ellipse", { x, y, w: d, h: d, fill: { color: c }, line: { color: c, width: 0 } });
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
  pres.layout = "LAYOUT_WIDE";
  pres.author = STUDENT;
  pres.title = "Elysian Celebrations — Internship Presentation";

  const darkA = () => { const s = pres.addSlide(); s.background = A("bg-dark-a.png"); return s; };
  const darkB = () => { const s = pres.addSlide(); s.background = A("bg-dark-b.png"); return s; };
  const darkC = () => { const s = pres.addSlide(); s.background = A("bg-dark-c.png"); return s; };
  const light = () => { const s = pres.addSlide(); s.background = A("bg-light.png"); return s; };

  /* ============================================================= 1 · cover */
  {
    const s = darkA();
    s.addImage({ ...A("motif-flow.png"), x: 7.7, y: 0.35, w: 6.6, h: 6.6, transparency: 24 });

    s.addText("INTERNSHIP PRESENTATION  ·  YEAR 3  ·  2026", {
      x: 0.85, y: 1.16, w: 7.2, h: 0.28, margin: 0,
      fontFace: SANS, fontSize: 11, bold: true, charSpacing: 3, color: CAMEL,
    });
    s.addText("Elysian\nCelebrations", {
      x: 0.85, y: 1.58, w: 7.2, h: 2.1, margin: 0,
      fontFace: SERIF, fontSize: 52, bold: true, color: BONE, lineSpacingMultiple: 0.96,
    });
    s.addText("Building a multi-brand event platform at TIPS Founder's Desk.", {
      x: 0.85, y: 3.78, w: 6.8, h: 0.4, margin: 0,
      fontFace: SANS, fontSize: 15, italic: true, color: KHAKI,
    });

    const meta = [
      ["PRESENTED BY", STUDENT, `${SID}  ·  ${UNIV}`],
      ["ROLE", "Founder's Desk Associate", "Digital Transformation & Venture Development"],
      ["ORGANISATION", "TIPS Founder's Desk", "The Indian Public School, Bengaluru"],
      ["ENGAGEMENT", PERIOD, "Hybrid, project-based · ongoing"],
    ];
    meta.forEach(([k, v, sub], i) => {
      const x = 0.85 + (i % 2) * 3.6;
      const y = 4.62 + Math.floor(i / 2) * 1.16;
      s.addText(k, {
        x, y, w: 3.4, h: 0.24, margin: 0,
        fontFace: SANS, fontSize: 8.5, bold: true, charSpacing: 2, color: OLIVE,
      });
      s.addText(v, {
        x, y: y + 0.26, w: 3.4, h: 0.28, margin: 0,
        fontFace: SANS, fontSize: 12.5, bold: true, color: BONE,
      });
      s.addText(sub, {
        x, y: y + 0.56, w: 3.4, h: 0.3, margin: 0,
        fontFace: SANS, fontSize: 9.5, color: BONE_DIM, lineSpacingMultiple: 1.0,
      });
    });
    s.addNotes(
      "(~10s) Good morning. I'm Rayyan Pasha, Year 3, Digital Transformation at Atria. " +
      "I intern as Founder's Desk Associate at TIPS Founder's Desk, and today I'm presenting " +
      "Elysian Celebrations — the platform I've been building there."
    );
  }

  /* ============================================================== 2 · role */
  {
    const s = light();
    eyebrow(s, "01 · THE ROLE");
    title(s, "My mandate was wider than one product.");

    card(s, { x: 0.75, y: 2.16, w: 4.42, h: 3.5, fill: INK, lineColor: INK });
    s.addText("THE ENGAGEMENT", {
      x: 1.05, y: 2.4, w: 3.9, h: 0.26, margin: 0,
      fontFace: SANS, fontSize: 9, bold: true, charSpacing: 2, color: CAMEL,
    });
    const eng = [
      ["Role", "Founder's Desk Associate — Digital Transformation, Venture Development & Strategic Initiatives", 2.78, 0.76],
      ["Reporting to", MENTOR, 3.76, 0.3],
      ["Period", PERIOD + "  (ongoing)", 4.36, 0.3],
      ["Work mode", "Hybrid, project-based", 4.96, 0.3],
    ];
    eng.forEach(([k, v, ey, vh]) => {
      s.addText(k, {
        x: 1.05, y: ey, w: 3.9, h: 0.22, margin: 0, valign: "top",
        fontFace: SANS, fontSize: 9, bold: true, charSpacing: 1.4, color: SAGE,
      });
      s.addText(v, {
        x: 1.05, y: ey + 0.22, w: 3.86, h: vh, margin: 0, valign: "top",
        fontFace: SANS, fontSize: 11.5, color: BONE, lineSpacingMultiple: 1.04,
      });
    });

    const areas = [
      ["A", "Founder's Desk & strategy support"],
      ["B", "Digital transformation of operations"],
      ["C", "Elysian & multi-brand venture building"],
      ["D", "EdTech & AI/chatbot prototypes"],
      ["E", "Hospitality, events & real estate"],
      ["F", "Data, research & reporting"],
    ];
    const cw = 3.42, cgap = 0.24;
    areas.forEach(([k, v], i) => {
      const x = 5.55 + (i % 2) * (cw + cgap);
      const y = 2.16 + Math.floor(i / 2) * 1.2;
      const hero = k === "C";
      card(s, { x, y, w: cw, h: 1.06, fill: hero ? CREAM : "FFFFFF", lineColor: hero ? BRAND : KHAKI, lineWidth: hero ? 1.5 : 0.75 });
      badge(s, { x: x + 0.24, y: y + 0.34, d: 0.38, text: k, size: 12, fill: hero ? BRAND : CAMEL, color: hero ? BONE : INK });
      s.addText(v, {
        x: x + 0.74, y: y + 0.18, w: cw - 0.98, h: 0.7, margin: 0,
        fontFace: SANS, fontSize: 11.5, bold: hero, color: INK, valign: "middle", lineSpacingMultiple: 1.02,
      });
    });

    card(s, { x: 0.75, y: 5.88, w: 11.833, h: 0.96, fill: INK, lineColor: INK, radius: 0.09 });
    s.addText("Across the other areas I shipped SOPs, dashboards and trackers, AI-chatbot prototypes, market research and founder-level decision decks. Elysian is where most of my build work went — so that is what I'll show you.", {
      x: 1.15, y: 5.98, w: 11.03, h: 0.76, margin: 0,
      fontFace: SANS, fontSize: 12, color: BONE, valign: "middle", lineSpacingMultiple: 1.04,
    });
    s.addNotes(
      "(~30s) My role spans six areas — strategy support, digitising operations, venture building, " +
      "EdTech and chatbot prototypes, hospitality and events, and research. Across those I've delivered " +
      "SOPs, dashboards, trackers, chatbot prototypes and business decks. Area C — Elysian — is where " +
      "most of my build work went, so that's what I'll focus on today."
    );
  }

  /* =========================================================== 3 · problem */
  {
    const s = light();
    eyebrow(s, "02 · THE PROBLEM");
    title(s, "A five-day celebration runs on\nspreadsheets, chats and memory.");

    const pains = [
      ["Nothing is connected", "Guest count in a sheet, menu in a chat, budget in someone's head. Change one and the rest go stale."],
      ["Everything is free text", "Vendors are typed, not chosen — so no system can price, book or report on them."],
      ["No one can see readiness", "“Are we ready for Day 3?” has no answer short of calling six people."],
    ];
    let y = 2.62;
    pains.forEach(([h, b], i) => {
      badge(s, { x: 0.75, y: y + 0.04, d: 0.36, text: String(i + 1), size: 12 });
      s.addText(h, {
        x: 1.28, y, w: 4.6, h: 0.3, margin: 0,
        fontFace: SANS, fontSize: 14.5, bold: true, color: INK,
      });
      s.addText(b, {
        x: 1.28, y: y + 0.34, w: 4.66, h: 0.8, margin: 0,
        fontFace: SANS, fontSize: 11.5, color: OLIVE, lineSpacingMultiple: 1.06,
      });
      y += 1.36;
    });

    s.addImage({ ...A("motif-fragments.png"), x: 6.68, y: 2.5, w: 5.9, h: 2.95 });
    card(s, { x: 6.68, y: 5.72, w: 5.9, h: 0.94, fill: CREAM, lineColor: KHAKI });
    s.addText("Six tools that never speak to each other — and one client expected to be the integration layer.", {
      x: 6.98, y: 5.8, w: 5.3, h: 0.78, margin: 0,
      fontFace: SANS, fontSize: 12, italic: true, color: INK, valign: "middle",
    });
    s.addNotes(
      "(~25s) A multi-day Indian celebration means twenty-plus functions across five days. " +
      "Today that's run across six disconnected tools, with the client acting as the integration layer. " +
      "Three problems: nothing is connected, everything is free text, and nobody can see readiness."
    );
  }

  /* ========================================================= 4 · what I built */
  {
    const s = light();
    eyebrow(s, "03 · WHAT I BUILT");
    title(s, "Define the event, map every function, prove it's ready.");

    const layers = [
      ["01", "DEFINE", "Event type, days, time blocks and needs — chosen, not typed.", SAGE],
      ["02", "MAP", "A visual flow map: event hub → days → functions → steps, with venue and vendor pickers inside each need.", CAMEL],
      ["03", "FINALIZE", "Readiness checks that expose gaps and link back to the exact function.", BRAND],
    ];
    const w = 3.644, gap = 0.45;
    layers.forEach(([n, name, body, c], i) => {
      const x = 0.75 + i * (w + gap);
      card(s, { x, y: 2.2, w, h: 2.44, fill: "FFFFFF" });
      badge(s, { x: x + 0.3, y: 2.46, d: 0.44, text: n, size: 13, fill: c, color: c === SAGE || c === CAMEL ? INK : BONE });
      s.addText(name, {
        x: x + 0.88, y: 2.5, w: w - 1.18, h: 0.36, margin: 0,
        fontFace: SANS, fontSize: 13, bold: true, charSpacing: 2.2, color: BRAND, valign: "middle",
      });
      s.addText(body, {
        x: x + 0.3, y: 3.08, w: w - 0.6, h: 1.3, margin: 0,
        fontFace: SANS, fontSize: 12, color: INK, lineSpacingMultiple: 1.06,
      });
      if (i < 2) {
        s.addShape("triangle", {
          x: x + w + 0.13, y: 3.3, w: 0.2, h: 0.24,
          fill: { color: CAMEL }, line: { color: CAMEL, width: 0 }, rotate: 90,
        });
      }
    });

    const stats = [
      ["61,000+", "lines of TypeScript"],
      ["62", "application routes"],
      ["59", "API endpoints"],
      ["27", "Postgres tables"],
      ["4", "role-based portals"],
    ];
    const sw = 2.2, sgap = 0.226;
    stats.forEach(([n, l], i) => {
      const x = 0.75 + i * (sw + sgap);
      card(s, { x, y: 4.96, w: sw, h: 1.32, fill: INK, lineColor: INK, radius: 0.09 });
      s.addText(n, {
        x: x + 0.18, y: 5.12, w: sw - 0.36, h: 0.56, margin: 0,
        fontFace: SERIF, fontSize: 25, bold: true, color: CAMEL, valign: "middle",
      });
      s.addText(l, {
        x: x + 0.18, y: 5.7, w: sw - 0.36, h: 0.44, margin: 0,
        fontFace: SANS, fontSize: 10.5, color: BONE, lineSpacingMultiple: 1.0,
      });
    });
    s.addText("Client · Vendor · Manager · Admin — one shared event spine, four different views of it.", {
      x: 0.75, y: 6.46, w: 11.833, h: 0.3, margin: 0,
      fontFace: SANS, fontSize: 11, italic: true, color: OLIVE,
    });
    s.addNotes(
      "(~35s) Elysian answers that in three layers. Define shapes the event. Map is the core — a visual " +
      "flow map where you drill from the event down to one step of one function, so the editor that opens " +
      "is small enough to finish. Finalize proves readiness. It's 61,000 lines of TypeScript, 62 routes, " +
      "59 API endpoints, 27 tables, and four role-based portals over one shared spine."
    );
  }

  /* ============================================================== 5 · demo */
  {
    const s = darkB();
    eyebrow(s, "04 · LIVE DEMO", true);
    s.addText("Let me show you\nthe real thing.", {
      x: 0.85, y: 2.02, w: 6.6, h: 1.86, margin: 0,
      fontFace: SERIF, fontSize: 40, bold: true, color: BONE, lineSpacingMultiple: 0.98,
    });
    card(s, { x: 0.85, y: 4.16, w: 5.5, h: 0.78, fill: BRAND, lineColor: BRAND, radius: 0.09, shadow: false });
    s.addText(SITE, {
      x: 0.85, y: 4.16, w: 5.5, h: 0.78, margin: 0,
      fontFace: SANS, fontSize: 17, bold: true, color: BONE, align: "center", valign: "middle",
    });

    const beats = [
      ["The flow map", "Drill from the event hub down to a single step of one function."],
      ["Vendor catalogue", "Selection happens inside the need — real offerings, never typed names."],
      ["Readiness gate", "The client total only appears once the function is genuinely complete."],
    ];
    beats.forEach(([h, b], i) => {
      const y = 2.12 + i * 1.46;
      card(s, { x: 7.3, y, w: 5.28, h: 1.28, fill: PANEL, lineColor: PANEL_LN, lineWidth: 1, shadow: false, radius: 0.09 });
      badge(s, { x: 7.6, y: y + 0.44, d: 0.4, text: String(i + 1), fill: CAMEL, color: INK, size: 12.5 });
      s.addText(h, {
        x: 8.14, y: y + 0.2, w: 4.2, h: 0.3, margin: 0,
        fontFace: SANS, fontSize: 13, bold: true, color: BONE,
      });
      s.addText(b, {
        x: 8.14, y: y + 0.52, w: 4.2, h: 0.62, margin: 0,
        fontFace: SANS, fontSize: 10.5, color: BONE_DIM, lineSpacingMultiple: 1.04,
      });
    });
    s.addText("Three beats, then straight back to the deck.", {
      x: 0.85, y: 5.26, w: 5.6, h: 0.34, margin: 0,
      fontFace: SANS, fontSize: 12, italic: true, color: KHAKI,
    });
    s.addNotes(
      "(~50s) DEMO — keep to three beats and do not wander. 1) The flow map: drill hub → day → function → step. " +
      "2) Open a need and select a vendor catalogue row. 3) Show the readiness gate holding the client price back. " +
      "Then close the tab and return to this deck. If the site or wifi fails, say so once and move on — " +
      "the next slide covers the stack anyway."
    );
  }

  /* ======================================================== 6 · technologies */
  {
    const s = light();
    eyebrow(s, "05 · TECHNOLOGIES USED");
    title(s, "A production stack, not a student stack.");

    const cols = [
      ["FRONTEND", ["Next.js 16 App Router", "React 19", "TypeScript (strict)", "Tailwind CSS v4", "Framer Motion"]],
      ["DATA", ["Supabase Postgres", "27 tables, 25 migrations", "Supabase Storage", "Generated DB types", "SQL constraints"]],
      ["AUTH & SECURITY", ["Clerk authentication", "Webhook role sync", "Row Level Security", "Server-side ownership", "Self-audited routes"]],
      ["DELIVERY", ["Vercel CI/CD", "Git branch workflow", "ESLint + tsc gates", "Scripted migrations", "AI-assisted development"]],
    ];
    const w = 2.86, gap = 0.31;
    cols.forEach(([head, items], i) => {
      const x = 0.75 + i * (w + gap);
      card(s, { x, y: 2.16, w, h: 3.86, fill: "FFFFFF" });
      s.addText(head, {
        x: x + 0.26, y: 2.42, w: w - 0.5, h: 0.28, margin: 0,
        fontFace: SANS, fontSize: 9.5, bold: true, charSpacing: 1.8, color: BRAND,
      });
      items.forEach((t, k) => {
        const y = 2.88 + k * 0.64;
        dot(s, x + 0.28, y + 0.1, k === 0 ? BRAND : CAMEL, 0.15);
        s.addText(t, {
          x: x + 0.56, y: y - 0.04, w: w - 0.82, h: 0.44, margin: 0,
          fontFace: SANS, fontSize: 11.5, bold: k === 0, color: k === 0 ? INK : OLIVE, valign: "middle",
        });
      });
    });
    s.addNotes(
      "(~25s) The stack is deliberately production-grade. Next.js 16 and React 19 on the front. " +
      "Supabase Postgres behind it, with 27 tables and 25 reviewed migrations — every schema change " +
      "in version control, none typed into a dashboard. Clerk for auth, with row-level security on " +
      "and ownership re-checked server-side. Shipped continuously through Vercel."
    );
  }

  /* ================================================= 7 · skills & challenges */
  {
    const s = light();
    eyebrow(s, "06 · SKILLS GAINED & CHALLENGES FACED");
    title(s, "What the work taught me — and what fought back.");

    card(s, { x: 0.75, y: 2.24, w: 5.5, h: 4.24, fill: "FFFFFF" });
    s.addText("SKILLS I GAINED", {
      x: 1.05, y: 2.5, w: 4.9, h: 0.28, margin: 0,
      fontFace: SANS, fontSize: 9.5, bold: true, charSpacing: 1.8, color: BRAND,
    });
    const skills = [
      ["Full-stack product engineering", "from schema to interface, alone"],
      ["Relational data modelling", "27 tables and a versioned migration habit"],
      ["Authorisation design", "four roles, each seeing different truths"],
      ["Security auditing", "reading my own code adversarially"],
      ["Design systems", "one palette and one component language"],
      ["AI-assisted development", "directing tools without losing the architecture"],
    ];
    skills.forEach(([h, b], i) => {
      const y = 2.92 + i * 0.6;
      dot(s, 1.05, y + 0.09, CAMEL, 0.15);
      s.addText(h, {
        x: 1.34, y: y - 0.04, w: 4.6, h: 0.26, margin: 0,
        fontFace: SANS, fontSize: 12, bold: true, color: INK,
      });
      s.addText(b, {
        x: 1.34, y: y + 0.2, w: 4.6, h: 0.26, margin: 0,
        fontFace: SANS, fontSize: 10, italic: true, color: OLIVE,
      });
    });

    s.addText("CHALLENGES I FACED", {
      x: 6.98, y: 2.5, w: 5.4, h: 0.28, margin: 0,
      fontFace: SANS, fontSize: 9.5, bold: true, charSpacing: 1.8, color: BRAND,
    });
    const challenges = [
      ["Two rules guarding one price", "Readiness was computed in the browser and again on the server, with different logic — and one copy decided whether a client could see a price.", "Collapsed it into a single server-side contract."],
      ["Three roles, three truths", "Vendors, clients and Elysian must each see a different part of the same number.", "Enforced in Postgres with generated columns, not in the UI."],
      ["Building solo on a live venture", "Product, design, backend and security with no team to hand work to.", "Wrote my own audits to catch what a reviewer would."],
    ];
    let cy = 2.92;
    challenges.forEach(([h, b, fix], i) => {
      card(s, { x: 6.68, y: cy, w: 5.9, h: 1.14, fill: i === 0 ? CREAM : "FFFFFF", lineColor: i === 0 ? BRAND : KHAKI, lineWidth: i === 0 ? 1.25 : 0.75, radius: 0.08 });
      s.addText(h, {
        x: 6.94, y: cy + 0.1, w: 5.4, h: 0.26, margin: 0,
        fontFace: SANS, fontSize: 12, bold: true, color: INK,
      });
      s.addText(b, {
        x: 6.94, y: cy + 0.36, w: 5.4, h: 0.42, margin: 0,
        fontFace: SANS, fontSize: 9.5, color: OLIVE, lineSpacingMultiple: 1.0,
      });
      s.addText("→ " + fix, {
        x: 6.94, y: cy + 0.8, w: 5.4, h: 0.26, margin: 0,
        fontFace: SANS, fontSize: 9.5, bold: true, italic: true, color: BRAND,
      });
      cy += 1.24;
    });
    s.addNotes(
      "(~35s) Skills first: I went from writing features to owning a system — data modelling, " +
      "authorisation design, security auditing, and directing AI tools without losing the architecture. " +
      "The hardest challenge was readiness being computed twice with different rules, where one copy " +
      "decided whether a client could see a price. I collapsed it to one server-side contract. " +
      "The lesson: duplicated logic near money is a security bug, not untidiness."
    );
  }

  /* ================================================ 8 · academic & future */
  {
    const s = darkC();
    eyebrow(s, "07 · ACADEMIC LEARNING APPLIED & FUTURE GOALS", true);
    title(s, "Digital Transformation, applied literally.", true);

    card(s, { x: 0.75, y: 2.32, w: 5.8, h: 4.06, fill: PANEL, lineColor: PANEL_LN, lineWidth: 1, shadow: false });
    s.addText("FROM THE CLASSROOM TO THE FOUNDER'S DESK", {
      x: 1.05, y: 2.58, w: 5.2, h: 0.28, margin: 0,
      fontFace: SANS, fontSize: 9.5, bold: true, charSpacing: 1.6, color: CAMEL,
    });
    const academic = [
      ["Process mapping & systems thinking", "became the flow map — the event modelled as days, functions and steps."],
      ["Database & data modelling", "became 27 normalised tables with constraints that encode business rules."],
      ["Data-driven decision making", "became readiness scoring and spend intelligence instead of guesswork."],
      ["Product thinking", "became the rule that users tap first and type only when they must."],
    ];
    let ay = 3.02;
    academic.forEach(([h, b]) => {
      dot(s, 1.05, ay + 0.08, SAGE, 0.15);
      s.addText(h, {
        x: 1.34, y: ay - 0.04, w: 4.96, h: 0.26, margin: 0,
        fontFace: SANS, fontSize: 12, bold: true, color: BONE,
      });
      s.addText(b, {
        x: 1.34, y: ay + 0.22, w: 4.96, h: 0.5, margin: 0,
        fontFace: SANS, fontSize: 10.5, color: BONE_DIM, lineSpacingMultiple: 1.02,
      });
      ay += 0.84;
    });

    card(s, { x: 6.78, y: 2.32, w: 5.8, h: 4.06, fill: PANEL, lineColor: PANEL_LN, lineWidth: 1, shadow: false });
    s.addText("WHERE THIS GOES NEXT", {
      x: 7.08, y: 2.58, w: 5.2, h: 0.28, margin: 0,
      fontFace: SANS, fontSize: 9.5, bold: true, charSpacing: 1.6, color: CAMEL,
    });
    const future = [
      ["Still building — through December 2026", "The engagement is ongoing; Elysian is not a finished submission."],
      ["Next: architecture, not features", "Transaction boundaries in Postgres, a split client/vendor ledger, and server-side decomposition of the planner."],
      ["Scale Elysian past events", "Extend the same spine to hospitality, education and real estate as a true multi-brand platform."],
      ["My own goal", "Grow into an engineer who owns systems end to end — and keeps auditing his own work."],
    ];
    let fy = 3.02;
    future.forEach(([h, b], i) => {
      badge(s, { x: 7.08, y: fy - 0.02, d: 0.3, text: String(i + 1), fill: CAMEL, color: INK, size: 10.5 });
      s.addText(h, {
        x: 7.52, y: fy - 0.04, w: 4.86, h: 0.26, margin: 0,
        fontFace: SANS, fontSize: 12, bold: true, color: BONE,
      });
      s.addText(b, {
        x: 7.52, y: fy + 0.22, w: 4.86, h: 0.5, margin: 0,
        fontFace: SANS, fontSize: 10.5, color: BONE_DIM, lineSpacingMultiple: 1.02,
      });
      fy += 0.84;
    });
    s.addNotes(
      "(~35s) My programme is Digital Transformation, and this internship was that, literally. " +
      "Process mapping became the flow map. Data modelling became 27 tables with rules enforced in SQL. " +
      "Data-driven decision making became readiness scoring. Looking forward — I'm still with TIPS " +
      "through December 2026. The next wave is architecture rather than features: transaction boundaries, " +
      "splitting the money ledger, and extending Elysian beyond events into hospitality, education and real estate."
    );
  }

  /* =========================================================== 9 · closing */
  {
    const s = darkA();
    s.addImage({ ...A("motif-flow.png"), x: 7.9, y: 0.55, w: 6.4, h: 6.4, transparency: 30 });

    s.addText("THANK YOU", {
      x: 0.85, y: 2.0, w: 7, h: 0.3, margin: 0,
      fontFace: SANS, fontSize: 11.5, bold: true, charSpacing: 3.2, color: CAMEL,
    });
    s.addText("Questions are\nwelcome.", {
      x: 0.85, y: 2.44, w: 7, h: 1.7, margin: 0,
      fontFace: SERIF, fontSize: 42, bold: true, color: BONE, lineSpacingMultiple: 0.98,
    });
    s.addText("Happy to go deeper on the flow map, the pricing model, or the audit.", {
      x: 0.85, y: 4.22, w: 6.4, h: 0.56, margin: 0,
      fontFace: SANS, fontSize: 13.5, italic: true, color: KHAKI, lineSpacingMultiple: 1.04,
    });

    const contact = [
      ["STUDENT", `${STUDENT}  ·  ${SID}`],
      ["PROGRAMME", PROGRAMME],
      ["MENTOR", MENTOR],
      ["ORGANISATION", ORG],
    ];
    contact.forEach(([k, v], i) => {
      const y = 5.02 + i * 0.5;
      s.addText(k, {
        x: 0.85, y, w: 1.9, h: 0.28, margin: 0,
        fontFace: SANS, fontSize: 8.5, bold: true, charSpacing: 1.8, color: OLIVE, valign: "middle",
      });
      s.addText(v, {
        x: 2.85, y, w: 4.9, h: 0.28, margin: 0,
        fontFace: SANS, fontSize: 11, bold: true, color: BONE, valign: "middle",
      });
    });
    s.addNotes("(~10s) Thank you — happy to take questions.");
  }

  const file = path.join(OUT, "Elysian-Internship-Presentation.pptx");
  await pres.writeFile({ fileName: file });
  console.log("wrote", file);
}

main().catch((e) => { console.error(e); process.exit(1); });
