from __future__ import annotations

from pathlib import Path
from textwrap import wrap

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "elysian-dashboard-flow-handbook.pdf"
ASSETS = ROOT / "tmp" / "pdfs" / "screens"
PAGE = landscape(A4)
W, H = PAGE

WALNUT = HexColor("#582f0e")
SADDLE = HexColor("#7f4f24")
TOFFEE = HexColor("#936639")
CAMEL = HexColor("#a68a64")
KHAKI = HexColor("#b6ad90")
SAGE = HexColor("#c2c5aa")
OLIVE = HexColor("#656d4a")
EBONY = HexColor("#414833")
CHARCOAL = HexColor("#333d29")
IVORY = HexColor("#f7f2e7")
CREAM = HexColor("#eee7d5")
WHITE = HexColor("#fffdf8")
SLATE = HexColor("#6d6f62")
ROSE = HexColor("#9e665b")


def set_fill(c: canvas.Canvas, color):
    c.setFillColor(color)


def text(c: canvas.Canvas, value: str, x: float, y: float, size=10, font="Helvetica", color=CHARCOAL):
    c.setFont(font, size)
    c.setFillColor(color)
    c.drawString(x, y, value)


def wrapped(c: canvas.Canvas, value: str, x: float, y: float, width: float, size=10, leading=14, font="Helvetica", color=SLATE, max_lines=None):
    avg = max(stringWidth("abcdefghijklmnopqrstuvwxyz", font, size) / 26, 1)
    chars = max(int(width / avg), 12)
    lines = []
    for paragraph in value.split("\n"):
        lines.extend(wrap(paragraph, width=chars) or [""])
    if max_lines:
        lines = lines[:max_lines]
    c.setFont(font, size)
    c.setFillColor(color)
    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y


def eyebrow(c: canvas.Canvas, label: str, x: float, y: float, color=TOFFEE):
    c.setFont("Helvetica-Bold", 6.8)
    c.setFillColor(color)
    c.drawString(x, y, label.upper())


def page_frame(c: canvas.Canvas, chapter: str, title: str, page_no: int, dark=False):
    bg = CHARCOAL if dark else IVORY
    fg = IVORY if dark else CHARCOAL
    c.setFillColor(bg)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setStrokeColor(KHAKI if dark else CAMEL)
    c.setLineWidth(0.6)
    c.line(34, H - 34, W - 34, H - 34)
    eyebrow(c, chapter, 34, H - 25, KHAKI if dark else TOFFEE)
    c.setFont("Times-Bold", 15)
    c.setFillColor(fg)
    c.drawRightString(W - 34, H - 26, title)
    c.setFont("Helvetica", 7)
    c.setFillColor(KHAKI if dark else SLATE)
    c.drawString(34, 19, "ELYSIAN EVENT OPERATING PLATFORM")
    c.drawRightString(W - 34, 19, f"{page_no:02d}")


def card(c: canvas.Canvas, x, y, w, h, title, body="", tag=None, dark=False):
    c.setFillColor(EBONY if dark else WHITE)
    c.setStrokeColor(KHAKI if dark else HexColor("#d8cfba"))
    c.setLineWidth(0.7)
    c.rect(x, y, w, h, fill=1, stroke=1)
    if tag:
        eyebrow(c, tag, x + 14, y + h - 17, KHAKI if dark else TOFFEE)
    c.setFont("Times-Bold", 14)
    c.setFillColor(IVORY if dark else CHARCOAL)
    c.drawString(x + 14, y + h - 38, title)
    if body:
        wrapped(c, body, x + 14, y + h - 56, w - 28, 8.2, 11.5, color=SAGE if dark else SLATE)


def pill(c: canvas.Canvas, value, x, y, color=OLIVE, width=None):
    width = width or max(45, stringWidth(value.upper(), "Helvetica-Bold", 6.5) + 20)
    c.setFillColor(color)
    c.roundRect(x, y, width, 19, 9, fill=1, stroke=0)
    c.setFont("Helvetica-Bold", 6.5)
    c.setFillColor(IVORY)
    c.drawCentredString(x + width / 2, y + 6.5, value.upper())
    return width


def draw_image(c: canvas.Canvas, name: str, x, y, w, h, label: str):
    path = ASSETS / name
    c.setFillColor(WHITE)
    c.setStrokeColor(HexColor("#d8cfba"))
    c.rect(x, y, w, h, fill=1, stroke=1)
    if path.exists():
        img = ImageReader(path)
        iw, ih = img.getSize()
        scale = min((w - 8) / iw, (h - 26) / ih)
        dw, dh = iw * scale, ih * scale
        c.drawImage(img, x + (w - dw) / 2, y + 21 + (h - 26 - dh) / 2, dw, dh, preserveAspectRatio=True, mask="auto")
    else:
        wrapped(c, f"Capture unavailable: {name}", x + 12, y + h / 2, w - 24, 9, 12)
    eyebrow(c, label, x + 10, y + 8, TOFFEE)


def route_rows(c: canvas.Canvas, rows, x, y, w, row_h=25):
    col = w / 2
    for idx, (label, route) in enumerate(rows):
        cx = x + (idx % 2) * col
        cy = y - (idx // 2) * row_h
        c.setStrokeColor(HexColor("#d8cfba"))
        c.line(cx, cy - 6, cx + col - 12, cy - 6)
        text(c, label, cx, cy + 4, 8.4, "Helvetica-Bold", CHARCOAL)
        text(c, route, cx + 96, cy + 4, 7.4, "Courier", TOFFEE)


def cover(c: canvas.Canvas):
    c.setFillColor(CHARCOAL)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(OLIVE)
    c.circle(W - 84, H - 78, 160, fill=1, stroke=0)
    c.setFillColor(WALNUT)
    c.circle(W - 40, 35, 130, fill=1, stroke=0)
    c.setStrokeColor(KHAKI)
    for offset in range(5):
        c.line(52, 68 + offset * 9, W - 52 - offset * 38, 68 + offset * 9)
    eyebrow(c, "Product, dashboard, and recording handbook", 52, H - 92, KHAKI)
    c.setFillColor(IVORY)
    c.setFont("Times-Bold", 38)
    c.drawString(52, H - 150, "Elysian")
    c.drawString(52, H - 194, "from definition to live delivery")
    wrapped(c, "Every dashboard, every role, one event source of truth.", 54, H - 234, 440, 13, 18, "Helvetica", SAGE)
    card(c, 52, 118, 208, 92, "Define", "Days, functions, guests, venues, and workstreams.", "01", dark=True)
    card(c, 274, 118, 208, 92, "Compose", "Vendors, menus, requirements, tasks, and cost.", "02", dark=True)
    card(c, 496, 118, 208, 92, "Deliver", "Operations, incidents, decisions, team, and print.", "03", dark=True)
    text(c, "VERIFIED LOCAL RELEASE LANE", 52, 43, 7, "Helvetica-Bold", KHAKI)
    text(c, "23 September 2026", 212, 43, 7, "Helvetica", SAGE)
    c.showPage()


def product_spine(c: canvas.Canvas, page_no: int):
    page_frame(c, "01 / Product spine", "One source, five controlled views", page_no)
    wrapped(c, "Elysian joins planning, commercial control, and live event delivery instead of scattering them across messages and spreadsheets.", 46, H - 74, 540, 11, 15, "Helvetica", SLATE)
    stages = [
        ("Client", "Defines and composes", OLIVE),
        ("Admin", "Publishes price and scope", WALNUT),
        ("Vendor", "Delivers agreed service", TOFFEE),
        ("Operations", "Runs the live event", EBONY),
        ("Event book", "Preserves field truth", CAMEL),
    ]
    y = 328
    for i, (name, body, color) in enumerate(stages):
        x = 42 + i * 155
        c.setFillColor(color)
        c.circle(x + 54, y + 54, 44, fill=1, stroke=0)
        text(c, f"0{i + 1}", x + 46, y + 67, 7, "Helvetica-Bold", KHAKI)
        c.setFont("Times-Bold", 13)
        c.setFillColor(IVORY)
        c.drawCentredString(x + 54, y + 46, name)
        wrapped(c, body, x + 2, y - 10, 105, 8, 11, "Helvetica", SLATE, 3)
        if i < len(stages) - 1:
            c.setStrokeColor(KHAKI)
            c.setLineWidth(2)
            c.line(x + 101, y + 54, x + 151, y + 54)
    card(c, 42, 88, 238, 100, "Full client price", "The client sees and pays the published final amount collected by Elysian.", "Client in")
    card(c, 302, 88, 238, 100, "Private vendor payout", "The vendor sees only the agreed payout and its settlement progress.", "Vendor out")
    card(c, 562, 88, 238, 100, "Fixed Elysian fee", "Admin records a fee. There is no quote negotiation state inside the product.", "Commercial rule")
    c.showPage()


def role_map(c, page_no, chapter, title, intro, rows, outcomes):
    page_frame(c, chapter, title, page_no)
    wrapped(c, intro, 42, H - 72, 720, 10.5, 14, "Helvetica", SLATE)
    route_rows(c, rows, 42, H - 122, 758, 27)
    base_y = 70
    card_w = (758 - 24) / 3
    for idx, (head, body) in enumerate(outcomes):
        card(c, 42 + idx * (card_w + 12), base_y, card_w, 93, head, body, f"Outcome {idx + 1}")
    c.showPage()


def evidence_page(c, page_no, chapter, title, left, right, note):
    page_frame(c, chapter, title, page_no)
    draw_image(c, left[0], 34, 154, 382, 335, left[1])
    draw_image(c, right[0], 426, 154, 382, 335, right[1])
    c.setFillColor(CHARCOAL)
    c.rect(34, 51, 774, 82, fill=1, stroke=0)
    eyebrow(c, "Authenticated verification evidence", 52, 111, KHAKI)
    wrapped(c, note, 52, 90, 730, 9, 13, "Helvetica", SAGE)
    c.showPage()


def commercial_page(c, page_no):
    page_frame(c, "08 / Commercial control", "Price once, expose only what each role needs", page_no, dark=True)
    c.setFont("Times-Bold", 27)
    c.setFillColor(IVORY)
    c.drawString(46, H - 92, "Vendor amount + fixed fee = final client price")
    wrapped(c, "Elysian agrees pricing offline and records the final commercial truth. The platform does not wait for an in-app quotation or negotiation loop.", 48, H - 122, 650, 11, 15, "Helvetica", SAGE)
    columns = [
        ("Client", "Published final price\nInvoices and receipts\nPaid and due", OLIVE),
        ("Vendor", "Agreed payout\nSettlement progress\nNo client price", TOFFEE),
        ("Admin", "Vendor amount\nFixed Elysian fee\nCollection and settlement", WALNUT),
    ]
    for i, (head, body, color) in enumerate(columns):
        x = 46 + i * 255
        c.setFillColor(color)
        c.rect(x, 205, 224, 170, fill=1, stroke=0)
        eyebrow(c, f"0{i+1}", x + 18, 348, KHAKI)
        c.setFont("Times-Bold", 22)
        c.setFillColor(IVORY)
        c.drawString(x + 18, 315, head)
        wrapped(c, body, x + 18, 282, 180, 10, 24, "Helvetica", IVORY)
    pill(c, "Gateway off by design", 46, 126, ROSE, 138)
    wrapped(c, "No API key, environment flag, or local test can charge a client. Provider activation requires legal approval, KYC, webhook secrets, canary transactions, reconciliation, refund testing, and explicit launch approval.", 200, 135, 590, 9.3, 13, "Helvetica", SAGE)
    c.showPage()


def security_page(c, page_no):
    page_frame(c, "09 / Access model", "Broad authority becomes exact event scope", page_no)
    card(c, 42, 342, 230, 132, "Clerk identity", "Determines the broad portal role: Client, Vendor, Manager, or Admin.", "Boundary 01")
    card(c, 305, 342, 230, 132, "Operations profile", "Admin chooses active state, role template, and explicit capabilities.", "Boundary 02")
    card(c, 568, 342, 230, 132, "Event assignment", "Capabilities apply only to the assigned events and shifts.", "Boundary 03")
    c.setStrokeColor(CAMEL)
    c.setLineWidth(2)
    c.line(272, 408, 305, 408)
    c.line(535, 408, 568, 408)
    rules = [
        ("Unprofiled platform manager", "May oversee the full portfolio and operational directories."),
        ("Profiled active employee", "Sees assigned events and granted capabilities only."),
        ("Profiled inactive employee", "Receives no operations event access."),
        ("Finance permission", "Controls financial context on screen and in print."),
        ("External messages", "Require client or vendor communication capability."),
        ("Internal feed", "Preserves incidents, decisions, owners, due times, and resolution history."),
    ]
    for i, (head, body) in enumerate(rules):
        x = 42 + (i % 2) * 390
        y = 289 - (i // 2) * 72
        pill(c, str(i + 1), x, y + 8, OLIVE, 24)
        text(c, head, x + 37, y + 22, 9.2, "Helvetica-Bold", CHARCOAL)
        wrapped(c, body, x + 37, y + 7, 330, 8.3, 11, "Helvetica", SLATE, 2)
    c.showPage()


def recording_page(c, page_no):
    page_frame(c, "10 / Recording runbook", "A 25-minute story, not a screen inventory", page_no)
    steps = [
        ("00-01", "Position Elysian", "Marketing story and the connected lifecycle."),
        ("01-05", "Define", "Client creates a corporate event, days, functions, venues, needs."),
        ("05-10", "Compose", "Map, vendor services, menu, requirements, tasks, readiness."),
        ("10-12", "Coordinate", "Cost, guests, run of show, bookings, billing, messages."),
        ("12-15", "Vendor", "Profile, service catalogue, work, calendar, payout."),
        ("15-19", "Admin", "Progress, pricing, billing, permissions, assignments."),
        ("19-24", "Operate", "Command center, incident, decision, team, event book."),
        ("24-25", "Close", "One event source, role-safe views, full lifecycle."),
    ]
    for i, (time, head, body) in enumerate(steps):
        col = i % 2
        row = i // 2
        x = 42 + col * 390
        y = 454 - row * 98
        c.setFillColor(OLIVE if i % 3 else WALNUT)
        c.circle(x + 26, y + 8, 25, fill=1, stroke=0)
        c.setFont("Helvetica-Bold", 7)
        c.setFillColor(IVORY)
        c.drawCentredString(x + 26, y + 5, time)
        text(c, head, x + 65, y + 24, 12, "Times-Bold", CHARCOAL)
        wrapped(c, body, x + 65, y + 6, 295, 8.5, 11.5, "Helvetica", SLATE, 3)
    c.setFillColor(CREAM)
    c.rect(42, 43, 758, 53, fill=1, stroke=0)
    eyebrow(c, "Full spoken script", 56, 75, TOFFEE)
    text(c, "docs/elysian-full-platform-walkthrough-script.md", 56, 56, 10, "Courier-Bold", CHARCOAL)
    c.showPage()


def verification_page(c, page_no):
    page_frame(c, "11 / Release proof", "The platform is tested as journeys, not isolated pages", page_no)
    groups = [
        "Portal routing and cross-role redirects",
        "Dashboards and privileged API denial",
        "Transactional event creation",
        "Atomic Layer 2 workspace save",
        "Client and vendor support workspaces",
        "Broad platform-manager oversight",
        "Scoped operations and incident lifecycle",
        "Vendor discovery and shortlist",
        "Booking and two-way messages",
        "Planner-to-cost synchronization",
        "Final pricing and client billing",
        "Every portal navigation destination",
    ]
    for i, label in enumerate(groups):
        col = i % 3
        row = i // 3
        x = 42 + col * 255
        y = 443 - row * 82
        c.setFillColor(SAGE)
        c.circle(x + 13, y + 11, 10, fill=1, stroke=0)
        text(c, "OK", x + 6.5, y + 8, 5.5, "Helvetica-Bold", CHARCOAL)
        wrapped(c, label, x + 34, y + 22, 190, 8.8, 11, "Helvetica-Bold", CHARCOAL, 3)
    card(c, 42, 55, 235, 88, "Static quality", "Lint, TypeScript, production build, dependency audit.", "Gate 01")
    card(c, 303, 55, 235, 88, "Database integrity", "Migration parity, dry-run, ownership, RLS, rollback suites.", "Gate 02")
    card(c, 564, 55, 235, 88, "Authenticated proof", "12 groups, role denials, persistence, navigation, cleanup.", "Gate 03")
    c.showPage()


def close_page(c, page_no):
    page_frame(c, "12 / Current boundary", "Complete platform, deliberate provider activation", page_no, dark=True)
    c.setFont("Times-Bold", 34)
    c.setFillColor(IVORY)
    c.drawString(48, H - 110, "Ready to plan, price,")
    c.drawString(48, H - 154, "coordinate, and operate.")
    wrapped(c, "The product is complete without live KYC or payment-provider credentials. Those credentials activate an external rail; they do not define the event platform.", 50, H - 198, 560, 12, 17, "Helvetica", SAGE)
    items = [
        "Multi-format event definition",
        "Function-level vendor composition",
        "Evidence-based cost and fixed final pricing",
        "Role-safe billing and vendor settlement",
        "Event-scoped team operations",
        "Incident, decision, and escalation history",
        "Printable event field book",
        "Rollback-clean authenticated verification",
    ]
    for i, item in enumerate(items):
        x = 50 + (i % 2) * 360
        y = 302 - (i // 2) * 49
        c.setFillColor(KHAKI)
        c.rect(x, y + 3, 8, 8, fill=1, stroke=0)
        text(c, item, x + 20, y, 10, "Helvetica", IVORY)
    text(c, "Detailed handbook: docs/elysian-dashboard-flow-handbook.md", 50, 54, 8, "Courier", KHAKI)
    c.showPage()


def build():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUT), pagesize=PAGE, pageCompression=1)
    c.setTitle("Elysian Dashboard and Flow Handbook")
    c.setAuthor("Elysian Celebrations")
    c.setSubject("Role dashboards, end-to-end flow, recording script, and verification contract")

    cover(c)
    product_spine(c, 2)
    role_map(c, 3, "02 / Client portal", "Plan and approve every function", "The client moves from definition to composition, then uses supporting workspaces without leaving the event source of truth.", [
        ("Dashboard", "/client"), ("Event Plan", "/client/wedding"),
        ("Cost Estimate", "/client/budget"), ("Vendors", "/client/vendors"),
        ("Guest List", "/client/guests"), ("Run of Show", "/client/timeline"),
        ("Mood Board", "/client/mood-board"), ("Messages", "/client/messages"),
        ("Bookings", "/client/bookings"), ("Billing", "/client/billing"),
        ("Settings", "/client/settings"), ("Onboarding", "/client/onboarding"),
    ], [
        ("Less typing", "Venue dropdowns, event taxonomy, requirement chips, and real vendor catalogues."),
        ("Stable structure", "Days, functions, menus, tasks, bookings, and cost retain shared identifiers."),
        ("Clear readiness", "Finalization opens the exact missing function and step."),
    ])
    evidence_page(c, 4, "03 / Client evidence", "The plan and cost are two views of the same event", ("client-plan.png", "Layer 2 radial event map"), ("client-cost.png", "Function-aware cost intelligence"), "These captures come from the rollback-clean authenticated fixture. The plan preserves orientation; the cost surface exposes only client-safe published and estimated values.")
    role_map(c, 5, "04 / Vendor portal", "Publish a catalogue the planner can actually use", "Vendor workspaces describe real services, catalogue rows, media, availability, bookings, communication, and agreed payout.", [
        ("Dashboard", "/vendor"), ("Analytics", "/vendor/analytics"),
        ("Profile", "/vendor/profile"), ("Services", "/vendor/services"),
        ("Portfolio", "/vendor/portfolio"), ("Reviews", "/vendor/reviews"),
        ("Inquiries", "/vendor/inquiries"), ("Confirmed", "/vendor/bookings"),
        ("Calendar", "/vendor/calendar"), ("Messages", "/vendor/messages"),
        ("Settings", "/vendor/settings"), ("Public profile", "/vendors/[slug]"),
    ], [
        ("Structured offer", "Scope, fit, inclusions, deliverables, add-ons, and item catalogue."),
        ("Visual proof", "Portfolio and per-item media create context before selection."),
        ("Private payout", "Only agreed vendor amount and settlement progress are visible."),
    ])
    evidence_page(c, 6, "05 / Vendor evidence", "The catalogue is a planning input, not a brochure", ("vendor-home.png", "Vendor operating dashboard"), ("vendor-services.png", "Structured services and catalogue"), "The vendor controls discoverability and delivery information. Client pricing and the Elysian fee never appear in this role.")
    role_map(c, 7, "06 / Administrator portal", "Govern portfolio, people, price, and settlement", "Admin operates the platform-wide control plane: catalogue quality, canonical readiness, fixed pricing, billing, identity, and exact employee scope.", [
        ("Dashboard", "/admin"), ("Analytics", "/admin/analytics"),
        ("Final Pricing", "/admin/pricing"), ("Client Billing", "/admin/billing"),
        ("Client Progress", "/admin/progress"), ("Revenue", "/admin/revenue"),
        ("Vendors", "/admin/vendors"), ("Clients", "/admin/clients"),
        ("Destinations", "/admin/destinations"), ("Packages", "/admin/packages"),
        ("Venues", "/admin/venues"), ("Blog Posts", "/admin/blog"),
        ("Client Stories", "/admin/testimonials"), ("Inquiries", "/admin/inquiries"),
        ("Users", "/admin/users"), ("Team & Permissions", "/admin/team"),
        ("Settings", "/admin/settings"), ("Operations data", "/api/operations/*"),
    ], [
        ("Commercial truth", "One final client price with separate inward and outward ledgers."),
        ("Canonical readiness", "Admin sees the same plan gaps the client must resolve."),
        ("Exact authority", "Capabilities plus assignments replace one all-powerful manager role."),
    ])
    evidence_page(c, 8, "07 / Admin evidence", "Pricing and permissions remain explicit", ("admin-pricing.png", "Final pricing control"), ("admin-team.png", "Capabilities and event assignment"), "Admin records the agreed vendor payout and fixed fee, then publishes one client amount. The same console turns a broad manager identity into a scoped operations employee.")
    role_map(c, 9, "08 / Operations portal", "Run the event without losing planning truth", "The delivery portal reshapes the approved plan for live use and keeps internal incidents and decisions separate from external messages.", [
        ("Operations Dashboard", "/manager"), ("Live Operations", "/manager/operations"),
        ("Command Center", "/manager/operations/[id]"), ("Event Book", "/manager/operations/[id]/print"),
        ("Event Directory", "/manager/weddings"), ("Inquiries", "/manager/inquiries"),
        ("Bookings", "/manager/bookings"), ("Messages", "/manager/messages"),
        ("Clients", "/manager/clients"), ("Vendors", "/manager/vendors"),
        ("Destinations", "/manager/destinations"), ("Settings", "/manager/settings"),
    ], [
        ("Live pulse", "Readiness, urgent work, overdue ownership, and upcoming functions."),
        ("Accountable history", "Reporter, owner, due time, acknowledgement, and resolution."),
        ("Field resilience", "The printable event book uses the same authorized source."),
    ])
    evidence_page(c, 10, "09 / Operations evidence", "Command center and event book stay synchronized", ("manager-command.png", "Event-scoped command center"), ("manager-print.png", "Printable field event book"), "Screen and print use the same permission-aware server read model. Finance appears only when the employee has finance capability.")
    commercial_page(c, 11)
    security_page(c, 12)
    recording_page(c, 13)
    verification_page(c, 14)
    close_page(c, 15)
    c.save()
    print(OUT)


if __name__ == "__main__":
    build()
