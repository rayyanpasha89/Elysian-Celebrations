import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintEventBookButton } from "@/components/dashboard/print-event-book-button";
import { productionTypeMeta } from "@/lib/event-production";
import { loadPrintableProductionRecords } from "@/lib/event-production-server";
import { loadOperationsWorkspace } from "@/lib/operations-server";
import { requirePortalPageRole } from "@/lib/portal-auth";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Relation<T> = T | T[] | null | undefined;

function list<T>(value: Relation<T>): T[] {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function dateLabel(value: string | null, includeTime = false) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

function money(value: number | null | undefined) {
  return value == null
    ? "Pending"
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(value);
}

export default async function EventBookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requirePortalPageRole(
    `/manager/operations/${id}/print`,
    "manager",
    "admin"
  );
  const workspace = await loadOperationsWorkspace(session, id);
  if (
    !workspace ||
    !workspace.access.permissions.includes("PRINT_EVENT_BOOK")
  ) {
    notFound();
  }

  const functions = workspace.days.flatMap((day) => day.functions);
  const productionRecords = await loadPrintableProductionRecords(
    id,
    workspace.access.permissions
  );
  const openItems = workspace.feed.filter((item) => item.status !== "RESOLVED");
  const financeVisible = workspace.access.permissions.includes("VIEW_FINANCIALS");
  const printedAt = new Date().toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="event-book-print mx-auto max-w-[210mm] bg-white text-charcoal">
      <div className="event-book-screen-actions mb-5 flex flex-wrap items-center justify-between gap-3 border border-charcoal/10 bg-cream p-4">
        <Link
          href={`/manager/operations/${id}`}
          className="font-accent text-[10px] uppercase tracking-[0.18em] text-slate hover:text-charcoal"
        >
          Back to command center
        </Link>
        <PrintEventBookButton />
      </div>

      <section className="event-book-section border-[3px] border-charcoal-brown p-8">
        <div className="flex items-start justify-between gap-6 border-b border-charcoal/15 pb-6">
          <div>
            <p className="font-accent text-[9px] uppercase tracking-[0.26em] text-saddle-brown">
              Elysian · Confidential operations book
            </p>
            <h1 className="mt-3 font-display text-5xl leading-tight text-charcoal-brown">
              {workspace.event.name}
            </h1>
            <p className="mt-3 font-heading text-base text-dusty-olive">
              {workspace.event.eventType} · {dateLabel(workspace.event.date)}
            </p>
          </div>
          <div className="border border-charcoal/15 px-4 py-3 text-right">
            <p className="font-accent text-[8px] uppercase tracking-[0.2em] text-slate">
              Generated
            </p>
            <p className="mt-1 font-heading text-sm text-charcoal">{printedAt}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-5">
          {[
            ["Destination", workspace.event.destination ?? "Pending"],
            ["Client", workspace.event.clientName],
            ["Functions", functions.length],
            ["Crew shifts", workspace.shifts.filter((shift) => shift.status !== "CANCELLED").length],
            ["Open issues", openItems.length],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="font-accent text-[8px] uppercase tracking-[0.18em] text-slate">
                {label}
              </p>
              <p className="mt-1 font-display text-xl text-charcoal">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-7 grid gap-6 border-t border-charcoal/10 pt-6 md:grid-cols-2">
          <div>
            <p className="font-accent text-[8px] uppercase tracking-[0.18em] text-slate">
              Client contact
            </p>
            <p className="mt-2 font-heading text-sm leading-6">
              {workspace.event.clientEmail ?? "Email pending"}
              <br />
              {workspace.event.clientPhone ?? "Phone pending"}
            </p>
          </div>
          <div>
            <p className="font-accent text-[8px] uppercase tracking-[0.18em] text-slate">
              Operating principle
            </p>
            <p className="mt-2 font-heading text-sm leading-6">
              Use this book as a field reference. Record every live change,
              decision, incident, and resolution in the Operations Portal.
            </p>
          </div>
        </div>
      </section>

      {openItems.length ? (
        <section className="event-book-section mt-6 border border-saddle-brown/40 p-6">
          <p className="font-accent text-[9px] uppercase tracking-[0.22em] text-saddle-brown">
            Open attention before doors
          </p>
          <div className="mt-4 space-y-3">
            {openItems.map((item) => (
              <div key={item.id} className="grid gap-2 border-t border-charcoal/10 pt-3 md:grid-cols-[7rem_1fr_auto]">
                <p className="font-accent text-[8px] uppercase tracking-[0.14em] text-saddle-brown">
                  {item.severity} · {item.kind}
                </p>
                <div>
                  <p className="font-heading text-sm font-semibold">{item.title}</p>
                  {item.body ? <p className="mt-1 font-heading text-xs leading-5 text-slate">{item.body}</p> : null}
                </div>
                <p className="font-heading text-xs text-slate">
                  {item.dueAt ? `Due ${dateLabel(item.dueAt, true)}` : item.status}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {workspace.days.map((day) => (
        <section key={day.id} className="event-book-day mt-8">
          <div className="flex items-end justify-between gap-5 border-b-2 border-charcoal-brown pb-3">
            <div>
              <p className="font-accent text-[9px] uppercase tracking-[0.22em] text-saddle-brown">
                {dateLabel(day.date)}
              </p>
              <h2 className="mt-1 font-display text-3xl">{day.name}</h2>
            </div>
            <p className="font-accent text-[8px] uppercase tracking-[0.16em] text-slate">
              {day.functions.length} functions
            </p>
          </div>

          <div className="mt-5 space-y-6">
            {day.functions.map((event) => {
              const logistics = list(event.logistics)[0];
              return (
                <article key={event.id} className="event-book-section border border-charcoal/15 p-5">
                  <div className="grid gap-5 md:grid-cols-[12rem_1fr]">
                    <div>
                      <p className="font-accent text-[8px] uppercase tracking-[0.18em] text-saddle-brown">
                        {event.time_block ?? event.event_type ?? "Function"}
                      </p>
                      <h3 className="mt-2 font-display text-2xl">{event.name}</h3>
                      <p className="mt-3 font-heading text-xs leading-6 text-slate">
                        {event.start_time ?? "Time pending"}
                        {event.end_time ? ` – ${event.end_time}` : ""}
                        <br />
                        {event.venue ?? "Venue pending"}
                        <br />
                        {event.guest_count ? `${event.guest_count} guests` : "Guest count pending"}
                      </p>
                      <p className={cn("mt-3 inline-block border px-2 py-1 font-accent text-[8px] uppercase tracking-[0.14em]", event.readiness.ready ? "border-dusty-olive text-dusty-olive" : "border-camel text-saddle-brown")}>
                        {event.readiness.percent}% ready
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="font-accent text-[8px] uppercase tracking-[0.18em] text-slate">Run of show</p>
                        <ol className="mt-2 space-y-1.5">
                          {list(event.tasks).map((task, index) => (
                            <li key={task.id} className="grid grid-cols-[1.5rem_1fr] font-heading text-xs leading-5">
                              <span>{String(index + 1).padStart(2, "0")}</span>
                              <span>{task.title} · {task.owner ?? "Owner pending"} · {task.status}</span>
                            </li>
                          ))}
                          {list(event.tasks).length === 0 ? <li className="font-heading text-xs text-slate">No run-of-show tasks saved.</li> : null}
                        </ol>
                      </div>
                      <div>
                        <p className="font-accent text-[8px] uppercase tracking-[0.18em] text-slate">Logistics calls</p>
                        <div className="mt-2 font-heading text-xs leading-5">
                          {logistics?.vendor_load_in_time ? <p>Vendor load-in · {logistics.vendor_load_in_time}</p> : null}
                          {logistics?.guest_arrival_time ? <p>Guest arrival · {logistics.guest_arrival_time}</p> : null}
                          {logistics?.family_call_time ? <p>Host call · {logistics.family_call_time}</p> : null}
                          {logistics?.transport_notes ? <p>Transport · {logistics.transport_notes}</p> : null}
                          {logistics?.weather_plan ? <p>Weather plan · {logistics.weather_plan}</p> : null}
                          {!logistics ? <p className="text-slate">No logistics details saved.</p> : null}
                        </div>
                      </div>
                      <div>
                        <p className="font-accent text-[8px] uppercase tracking-[0.18em] text-slate">Food and hospitality</p>
                        <div className="mt-2 space-y-2">
                          {list(event.menus).map((menu) => (
                            <div key={menu.id}>
                              <p className="font-heading text-xs font-semibold">{menu.name} · {menu.service_style ?? "Style pending"}</p>
                              <p className="font-heading text-[10px] leading-4 text-slate">{list(menu.items).map((item) => item.name).join(" · ") || "Items pending"}</p>
                            </div>
                          ))}
                          {list(event.menus).length === 0 ? <p className="font-heading text-xs text-slate">No menu saved.</p> : null}
                        </div>
                      </div>
                      <div>
                        <p className="font-accent text-[8px] uppercase tracking-[0.18em] text-slate">Partners</p>
                        <div className="mt-2 space-y-2">
                          {event.bookings.map((booking) => (
                            <div key={booking.id} className="font-heading text-xs leading-5">
                              <p className="font-semibold">{booking.vendor} · {booking.service}</p>
                              <p className="text-slate">{booking.vendorPhone ?? "Contact pending"} · {booking.status}</p>
                              {financeVisible ? <p className="text-slate">Client total {money(booking.clientTotal)} · Due {money(booking.due)}</p> : null}
                            </div>
                          ))}
                          {event.bookings.length === 0 ? <p className="font-heading text-xs text-slate">No partner selected.</p> : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      {workspace.briefings.length ? (
        <section className="event-book-day mt-8">
          <div className="border-b-2 border-charcoal-brown pb-3">
            <p className="font-accent text-[9px] uppercase tracking-[0.22em] text-saddle-brown">Command communications</p>
            <h2 className="mt-1 font-display text-3xl">Published briefings</h2>
          </div>
          <div className="mt-5 space-y-4">
            {workspace.briefings.map((briefing) => (
              <article key={briefing.id} className="event-book-section border border-charcoal/15 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-accent text-[8px] uppercase tracking-[0.16em] text-saddle-brown">{briefing.priority} · {briefing.departmentName ?? "All departments"} · {briefing.zoneName ?? "All zones"}</p>
                    <h3 className="mt-2 font-display text-xl">{briefing.title}</h3>
                  </div>
                  <p className="font-heading text-[10px] text-slate">{briefing.acknowledgementCount} acknowledged</p>
                </div>
                <p className="mt-3 whitespace-pre-wrap font-heading text-xs leading-5 text-slate">{briefing.body}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {productionRecords.length ? (
        <section className="event-book-day mt-8">
          <div className="border-b-2 border-charcoal-brown pb-3">
            <p className="font-accent text-[9px] uppercase tracking-[0.22em] text-saddle-brown">Production control</p>
            <h2 className="mt-1 font-display text-3xl">Dossier and readiness register</h2>
          </div>
          <div className="mt-5 space-y-4">
            {productionRecords.map((record) => (
              <article key={record.id} className="event-book-section border border-charcoal/15 p-4">
                <div className="grid gap-3 md:grid-cols-[9rem_1fr_auto]">
                  <div>
                    <p className="font-accent text-[8px] uppercase tracking-[0.16em] text-saddle-brown">
                      {productionTypeMeta(record.record_type).label}
                    </p>
                    <p className="mt-2 font-accent text-[7px] uppercase tracking-[0.13em] text-slate">
                      {record.status.replaceAll("_", " ")}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-display text-xl">{record.title}</h3>
                    {record.description ? <p className="mt-1 font-heading text-xs leading-5 text-slate">{record.description}</p> : null}
                    {record.notes ? <p className="mt-2 border-l border-camel pl-3 font-heading text-[10px] leading-4 text-charcoal">{record.notes}</p> : null}
                    {record.attachments.length ? <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">{record.attachments.map((attachment) => <a key={attachment.id} href={attachment.url} className="font-heading text-[9px] text-saddle-brown underline">{attachment.title}</a>)}</div> : null}
                  </div>
                  <div className="font-heading text-[10px] leading-5 text-slate md:text-right">
                    <p>{record.owner_label ?? "Owner unassigned"}</p>
                    <p>{record.due_at ? `Due ${dateLabel(record.due_at, true)}` : "No deadline"}</p>
                    {financeVisible && record.amount != null ? <p>{money(record.amount)}</p> : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="event-book-day mt-8">
        <div className="border-b-2 border-charcoal-brown pb-3">
          <p className="font-accent text-[9px] uppercase tracking-[0.22em] text-saddle-brown">Deployment matrix</p>
          <h2 className="mt-1 font-display text-3xl">Crew call sheet</h2>
        </div>
        <div className="mt-5 overflow-hidden border border-charcoal/15">
          <table className="w-full border-collapse text-left">
            <thead><tr className="border-b border-charcoal/15 bg-cream">{["Crew", "Role", "Department / zone", "Function", "Window", "Status"].map((heading) => <th key={heading} className="px-2 py-2 font-accent text-[7px] uppercase tracking-[0.14em] text-slate">{heading}</th>)}</tr></thead>
            <tbody>{workspace.shifts.map((shift) => <tr key={shift.id} className="border-b border-charcoal/10"><td className="px-2 py-2 font-heading text-[10px] font-semibold">{shift.staffName}</td><td className="px-2 py-2 font-heading text-[10px]">{shift.roleLabel}</td><td className="px-2 py-2 font-heading text-[10px]">{shift.departmentName ?? "General"}<span className="block text-[9px] text-slate">{shift.zoneName ?? "Event-wide"}</span></td><td className="px-2 py-2 font-heading text-[10px]">{shift.eventName ?? "Whole event"}</td><td className="px-2 py-2 font-heading text-[9px]">{dateLabel(shift.shiftStart, true)}<span className="block text-slate">to {dateLabel(shift.shiftEnd, true)}</span></td><td className="px-2 py-2 font-accent text-[7px] uppercase tracking-[0.12em]">{shift.status.replaceAll("_", " ")}</td></tr>)}</tbody>
          </table>
          {workspace.shifts.length === 0 ? <p className="p-6 text-center font-heading text-xs text-slate">No crew shifts scheduled.</p> : null}
        </div>
      </section>

      <section className="event-book-day mt-8">
        <div className="border-b-2 border-charcoal-brown pb-3">
          <p className="font-accent text-[9px] uppercase tracking-[0.22em] text-saddle-brown">Field directory</p>
          <h2 className="mt-1 font-display text-3xl">Assigned delivery team</h2>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {workspace.team.map((member) => (
            <article key={member.id} className="event-book-section border border-charcoal/15 p-4">
              <p className="font-display text-xl">{member.name}</p>
              <p className="mt-1 font-heading text-xs text-slate">{member.eventRole} · {member.jobTitle ?? member.roleTemplate.replaceAll("_", " ")}</p>
              <p className="mt-3 font-heading text-xs leading-5">{member.phone ?? "Phone pending"}<br />{member.email ?? "Email pending"}</p>
              {member.shiftStart ? <p className="mt-2 font-heading text-[10px] text-slate">Shift {dateLabel(member.shiftStart, true)}{member.shiftEnd ? ` – ${dateLabel(member.shiftEnd, true)}` : ""}</p> : null}
            </article>
          ))}
        </div>
      </section>

      <footer className="mt-10 border-t border-charcoal/20 pt-4 font-accent text-[8px] uppercase tracking-[0.18em] text-slate">
        Confidential · Internal operations reference · Verify live changes in the Elysian Operations Portal
      </footer>
    </div>
  );
}
