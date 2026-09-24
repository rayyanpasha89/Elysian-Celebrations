"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  Clock3,
  MapPin,
  MessageSquare,
  Printer,
  Radio,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardLoadError } from "@/components/dashboard/dashboard-load-error";
import {
  OperationsWorkforcePanel,
  type OperationsBriefing,
  type OperationsDepartment,
  type OperationsShift,
  type OperationsZone,
} from "@/components/dashboard/operations-workforce-panel";
import {
  OPERATIONS_ITEM_KINDS,
  OPERATIONS_SEVERITIES,
  type OperationsItemKind,
  type OperationsPermission,
  type OperationsSeverity,
} from "@/lib/operations";
import { dashBtn, dashCard, dashLabel, statusBadgeBase } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type Relation<T> = T | T[] | null | undefined;
type Requirement = { category: string; title: string; status: string; notes: string | null };
type Menu = { id: string; name: string; meal_period: string | null; service_style: string | null; notes: string | null; items: Relation<{ id: string; name: string; course: string | null; dietary_tags: string[]; notes: string | null }> };
type Task = { id: string; title: string; owner: string | null; status: string; due_date: string | null };
type Booking = { id: string; status: string; vendor: string; vendorPhone: string | null; service: string; clientTotal?: number | null; received?: number; due?: number | null };
type EventFunction = {
  id: string;
  name: string;
  event_type: string | null;
  time_block: string | null;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  guest_count: number | null;
  notes: string | null;
  readiness: { percent: number; ready: boolean; gaps: { key: string; label: string; detail: string }[] };
  requirements: Relation<Requirement>;
  menus: Relation<Menu>;
  logistics: Relation<{ guest_arrival_time: string | null; vendor_load_in_time: string | null; family_call_time: string | null; transport_notes: string | null; rooming_notes: string | null; weather_plan: string | null; ceremony_notes: string | null }>;
  tasks: Relation<Task>;
  bookings: Booking[];
};
type Day = { id: string; name: string; date: string | null; functions: EventFunction[] };
type TeamMember = { id: string; userId: string; name: string; email: string | null; phone: string | null; avatar: string | null; roleTemplate: string; jobTitle: string | null; eventRole: string; shiftStart: string | null; shiftEnd: string | null; notes: string | null };
type FeedItem = { id: string; eventId: string | null; kind: string; severity: string; status: string; title: string; body: string | null; assigneeUserId: string | null; departmentId: string | null; departmentName: string | null; zoneId: string | null; zoneName: string | null; reportedByName: string; dueAt: string | null; acknowledgedAt: string | null; resolvedAt: string | null; resolvedByName: string | null; createdAt: string };
type Workspace = {
  access: { permissions: OperationsPermission[]; eventRole: string | null; isAdmin: boolean };
  event: { id: string; name: string; date: string | null; status: string; eventType: string; destination: string | null; country: string | null; heroImage: string | null; clientName: string; clientEmail: string | null; clientPhone: string | null };
  days: Day[];
  team: TeamMember[];
  departments: OperationsDepartment[];
  zones: OperationsZone[];
  shifts: OperationsShift[];
  briefings: OperationsBriefing[];
  feed: FeedItem[];
};

type Tab = "overview" | "run" | "feed" | "crew" | "briefings";

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

function currency(value: number | null | undefined) {
  return value == null ? "Pending" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function severityClass(severity: string) {
  return cn(
    statusBadgeBase,
    severity === "CRITICAL" && "border-saddle-brown bg-saddle-brown/10 text-saddle-brown",
    severity === "URGENT" && "border-toffee-brown/50 bg-toffee-brown/8 text-toffee-brown",
    severity === "WATCH" && "border-camel/60 bg-camel/8 text-saddle-brown",
    severity === "INFO" && "border-dry-sage-2/60 bg-dry-sage/20 text-dusty-olive"
  );
}

export default function OperationsCommandCenterPage() {
  const { id } = useParams<{ id: string }>();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [kind, setKind] = useState<OperationsItemKind>("UPDATE");
  const [severity, setSeverity] = useState<OperationsSeverity>("INFO");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [eventId, setEventId] = useState("");
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [dueAt, setDueAt] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`/api/operations/events/${id}`, { cache: "no-store" });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error ?? "Operations room could not be loaded");
    return json as Workspace;
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        setLoadError(false);
        const result = await load();
        if (!cancelled) setWorkspace(result);
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load, reloadKey]);

  const functions = useMemo(
    () => workspace?.days.flatMap((day) => day.functions.map((event) => ({ ...event, dayName: day.name, dayDate: day.date }))) ?? [],
    [workspace]
  );
  const feed = useMemo(() => workspace?.feed ?? [], [workspace]);
  const pulse = useMemo(() => ({
    open: feed.filter((item) => item.status !== "RESOLVED").length,
    urgent: feed.filter((item) => item.status !== "RESOLVED" && ["URGENT", "CRITICAL"].includes(item.severity)).length,
    ready: functions.filter((event) => event.readiness.ready).length,
    vendors: functions.reduce((sum, event) => sum + event.bookings.length, 0),
  }), [feed, functions]);

  const permissions = workspace?.access.permissions ?? [];
  const canPost = permissions.includes("POST_INTERNAL_UPDATES");
  const canManageIncidents = permissions.includes("MANAGE_INCIDENTS");
  const canPrint = permissions.includes("PRINT_EVENT_BOOK");
  const canViewFinancials = permissions.includes("VIEW_FINANCIALS");
  const canReadExternalMessages = permissions.some((permission) =>
    ["MESSAGE_CLIENT", "MESSAGE_VENDORS"].includes(permission)
  );

  const createItem = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(`/api/operations/events/${id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          severity,
          title,
          body,
          eventId: eventId || null,
          assigneeUserId: assigneeUserId || null,
          departmentId: departmentId || null,
          zoneId: zoneId || null,
          dueAt: dueAt || null,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Update could not be saved");
      setTitle("");
      setBody("");
      setDepartmentId("");
      setZoneId("");
      setDueAt("");
      setKind("UPDATE");
      setSeverity("INFO");
      setWorkspace(await load());
      toast.success("Operations feed updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update could not be saved");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (itemId: string, status: "ACKNOWLEDGED" | "RESOLVED" | "OPEN") => {
    setSaving(true);
    try {
      const response = await fetch(`/api/operations/events/${id}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Status could not be updated");
      setWorkspace(await load());
      toast.success(status === "RESOLVED" ? "Item resolved" : "Status updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Status could not be updated");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="mx-auto max-w-7xl animate-pulse space-y-5"><div className="h-64 bg-charcoal/5" /><div className="h-96 bg-charcoal/5" /></div>;
  if (loadError || !workspace) return <DashboardLoadError eyebrow="Live delivery" pageTitle="Operations room" label="Command center unavailable" title="This event workspace could not be opened" description="The event may no longer be assigned to you, or the live source could not be reached. No details have been inferred." onRetry={() => setReloadKey((value) => value + 1)} />;

  const event = workspace.event;
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <Link href="/manager/operations" className="inline-flex items-center gap-2 font-accent text-[10px] uppercase tracking-[0.2em] text-slate hover:text-gold-dark"><ArrowLeft className="h-4 w-4" /> All assigned events</Link>
      <section className="relative min-h-[20rem] overflow-hidden border border-charcoal/10 bg-charcoal-brown text-ivory">
        <div aria-hidden className="absolute inset-0 bg-cover bg-center opacity-35 mix-blend-luminosity" style={{ backgroundImage: `linear-gradient(90deg,rgba(51,61,41,.98),rgba(51,61,41,.45)),url(${event.heroImage ?? "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1800&q=80"})` }} />
        <div className="relative flex min-h-[20rem] flex-col justify-between gap-8 p-7 md:p-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="font-accent text-[10px] uppercase tracking-[0.24em] text-khaki-beige">Live operations · {event.eventType}</p><h1 className="mt-3 max-w-3xl font-display text-4xl leading-tight md:text-6xl">{event.name}</h1><div className="mt-4 flex flex-wrap gap-4 font-heading text-xs text-ivory/62"><span className="flex items-center gap-1.5"><CalendarClock className="h-4 w-4" />{dateLabel(event.date)}</span><span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{event.destination ?? "Destination pending"}</span><span className="flex items-center gap-1.5"><Users className="h-4 w-4" />{event.clientName}</span></div></div>
            <div className="flex flex-wrap gap-2">{canPrint ? <Link href={`/manager/operations/${id}/print`} target="_blank" className="inline-flex items-center gap-2 border border-khaki-beige/50 bg-charcoal-brown/35 px-4 py-3 font-accent text-[9px] uppercase tracking-[0.18em] text-khaki-beige backdrop-blur hover:bg-khaki-beige hover:text-charcoal-brown"><Printer className="h-4 w-4" /> Print event book</Link> : null}{canReadExternalMessages ? <Link href="/manager/messages" className="inline-flex items-center gap-2 border border-ivory/18 bg-charcoal-brown/35 px-4 py-3 font-accent text-[9px] uppercase tracking-[0.18em] text-ivory/70 backdrop-blur hover:border-khaki-beige"><MessageSquare className="h-4 w-4" /> External messages</Link> : null}</div>
          </div>
          <div className="grid max-w-3xl grid-cols-2 gap-px bg-ivory/12 sm:grid-cols-4">
            {[["Open items", pulse.open], ["Urgent", pulse.urgent], ["Functions ready", `${pulse.ready}/${functions.length}`], ["Partners", pulse.vendors]].map(([label, value]) => <div key={label} className="bg-charcoal-brown/76 px-4 py-4 backdrop-blur"><p className="font-display text-2xl">{value}</p><p className="mt-1 font-accent text-[8px] uppercase tracking-[0.18em] text-ivory/45">{label}</p></div>)}
          </div>
        </div>
      </section>

      <nav className="scrollbar-elysian flex overflow-x-auto border-b border-charcoal/12" aria-label="Operations workspace sections">
        {([[
          "overview", "Live pulse"], ["run", "Run of show"], ["feed", `Feed · ${pulse.open}`], ["crew", `Crew · ${workspace.shifts.length}`], ["briefings", `Briefings · ${workspace.briefings.length}`]] as [Tab, string][]).map(([value, label]) => <button key={value} type="button" onClick={() => setTab(value)} className={cn("whitespace-nowrap border-b-2 px-5 py-3 font-accent text-[10px] uppercase tracking-[0.18em]", tab === value ? "border-gold-primary text-charcoal" : "border-transparent text-slate hover:text-charcoal")}>{label}</button>)}
      </nav>

      {tab === "overview" ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="space-y-5">
            {workspace.days.map((day) => <section key={day.id} className={dashCard}><div className="flex flex-wrap items-end justify-between gap-3 border-b border-charcoal/8 pb-4"><div><p className={dashLabel}>{dateLabel(day.date)}</p><h2 className="mt-1 font-display text-2xl text-charcoal">{day.name}</h2></div><span className={cn(statusBadgeBase, "border-charcoal/12 text-slate")}>{day.functions.length} functions</span></div><div className="mt-4 grid gap-3 md:grid-cols-2">{day.functions.map((item) => <div key={item.id} className="border border-charcoal/8 bg-cream/45 p-4"><div className="flex items-start justify-between gap-3"><div><p className={dashLabel}>{item.time_block ?? "Function"}</p><h3 className="mt-1 font-display text-xl text-charcoal">{item.name}</h3></div><span className={cn(statusBadgeBase, item.readiness.ready ? "border-dry-sage-2/60 text-dusty-olive" : "border-camel/50 text-saddle-brown")}>{item.readiness.percent}%</span></div><div className="mt-3 space-y-1.5 font-heading text-xs text-slate"><p className="flex items-center gap-2"><Clock3 className="h-3.5 w-3.5" />{item.start_time ?? "Time pending"}{item.end_time ? ` – ${item.end_time}` : ""}</p><p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{item.venue ?? "Venue pending"}</p><p className="flex items-center gap-2"><Users className="h-3.5 w-3.5" />{item.guest_count ? `${item.guest_count} guests` : "Guest count pending"}</p></div>{item.readiness.gaps.length ? <p className="mt-3 border-t border-charcoal/8 pt-3 font-heading text-[11px] leading-5 text-saddle-brown">Next: {item.readiness.gaps[0].detail}</p> : <p className="mt-3 flex items-center gap-1.5 border-t border-charcoal/8 pt-3 font-heading text-[11px] text-dusty-olive"><CheckCircle2 className="h-3.5 w-3.5" /> Ready for delivery</p>}</div>)}</div></section>)}
          </div>
          <aside className="space-y-5">
            <section className={dashCard}><p className={dashLabel}>Client anchor</p><h2 className="mt-2 font-display text-2xl text-charcoal">{event.clientName}</h2><div className="mt-4 space-y-2 font-heading text-sm text-slate">{event.clientEmail ? <p>{event.clientEmail}</p> : null}{event.clientPhone ? <p>{event.clientPhone}</p> : null}</div></section>
            <section className={dashCard}><p className={dashLabel}>Open attention</p><div className="mt-4 space-y-3">{feed.filter((item) => item.status !== "RESOLVED").slice(0, 5).map((item) => <button key={item.id} type="button" onClick={() => setTab("feed")} className="block w-full border-l-2 border-camel pl-3 text-left"><span className={severityClass(item.severity)}>{item.severity}</span><span className="mt-2 block font-heading text-sm text-charcoal">{item.title}</span><span className="mt-1 block font-heading text-[11px] text-slate">{item.reportedByName} · {dateLabel(item.createdAt, true)}</span></button>)}{pulse.open === 0 ? <p className="font-heading text-sm text-slate">No open incidents or decisions.</p> : null}</div></section>
          </aside>
        </div>
      ) : null}

      {tab === "run" ? <div className="space-y-5">{functions.map((item) => { const logistics = list(item.logistics)[0]; return <section key={item.id} className={dashCard}><div className="grid gap-5 lg:grid-cols-[16rem_1fr]"><div><p className={dashLabel}>{item.dayName} · {item.time_block ?? "Function"}</p><h2 className="mt-2 font-display text-2xl text-charcoal">{item.name}</h2><p className="mt-3 font-heading text-xs leading-6 text-slate">{item.start_time ?? "Time pending"}{item.end_time ? ` – ${item.end_time}` : ""}<br />{item.venue ?? "Venue pending"}<br />{item.guest_count ? `${item.guest_count} guests` : "Guest count pending"}</p></div><div className="grid gap-4 md:grid-cols-3"><div className="border border-charcoal/8 bg-cream/45 p-4"><p className={dashLabel}>Run of show</p><div className="mt-3 space-y-2">{list(item.tasks).map((task) => <div key={task.id} className="flex gap-2 font-heading text-xs text-charcoal"><CircleDot className="mt-0.5 h-3.5 w-3.5 flex-none text-camel" /><span>{task.title}<span className="block text-[10px] text-slate">{task.owner ?? "Owner pending"} · {task.status}</span></span></div>)}{list(item.tasks).length === 0 ? <p className="font-heading text-xs text-slate">No run-of-show tasks yet.</p> : null}</div></div><div className="border border-charcoal/8 bg-cream/45 p-4"><p className={dashLabel}>Food & hospitality</p><div className="mt-3 space-y-2">{list(item.menus).map((menu) => <div key={menu.id}><p className="font-heading text-sm text-charcoal">{menu.name}</p><p className="font-heading text-[10px] text-slate">{list(menu.items).length} items · {menu.service_style ?? "Style pending"}</p></div>)}{list(item.menus).length === 0 ? <p className="font-heading text-xs text-slate">No menu attached.</p> : null}</div></div><div className="border border-charcoal/8 bg-cream/45 p-4"><p className={dashLabel}>Logistics calls</p><div className="mt-3 space-y-1.5 font-heading text-xs text-charcoal">{logistics?.vendor_load_in_time ? <p>Load-in · {logistics.vendor_load_in_time}</p> : null}{logistics?.guest_arrival_time ? <p>Guest arrival · {logistics.guest_arrival_time}</p> : null}{logistics?.family_call_time ? <p>Host call · {logistics.family_call_time}</p> : null}{!logistics ? <p className="text-slate">No logistics details yet.</p> : null}</div></div></div></div>{item.bookings.length ? <div className="mt-5 border-t border-charcoal/8 pt-4"><p className={dashLabel}>Selected partners</p><div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{item.bookings.map((booking) => <div key={booking.id} className="border border-charcoal/8 px-4 py-3"><div className="flex items-start justify-between gap-2"><div><p className="font-heading text-sm font-semibold text-charcoal">{booking.vendor}</p><p className="font-heading text-xs text-slate">{booking.service}</p></div><span className={cn(statusBadgeBase, "border-charcoal/10 text-slate")}>{booking.status}</span></div>{booking.vendorPhone ? <p className="mt-2 font-heading text-xs text-slate">{booking.vendorPhone}</p> : null}{canViewFinancials ? <div className="mt-3 flex justify-between border-t border-charcoal/8 pt-2 font-heading text-[11px] text-slate"><span>Client total {currency(booking.clientTotal)}</span><span>Due {currency(booking.due)}</span></div> : null}</div>)}</div></div> : null}</section>; })}</div> : null}

      {tab === "feed" ? <div className="grid gap-5 xl:grid-cols-[23rem_minmax(0,1fr)]">{canPost || canManageIncidents ? <form onSubmit={createItem} className={cn(dashCard, "self-start")}><p className={dashLabel}>Add to live record</p><h2 className="mt-2 font-display text-2xl text-charcoal">Update the room</h2><div className="mt-5 space-y-4"><label className="block space-y-2"><span className={dashLabel}>Type</span><select value={kind} onChange={(event) => setKind(event.target.value as OperationsItemKind)} className="w-full border border-charcoal/15 bg-cream px-3 py-3 font-heading text-sm">{OPERATIONS_ITEM_KINDS.filter((value) => canManageIncidents || !["INCIDENT", "ESCALATION"].includes(value)).map((value) => <option key={value}>{value}</option>)}</select></label><label className="block space-y-2"><span className={dashLabel}>Severity</span><select value={severity} onChange={(event) => setSeverity(event.target.value as OperationsSeverity)} className="w-full border border-charcoal/15 bg-cream px-3 py-3 font-heading text-sm">{OPERATIONS_SEVERITIES.map((value) => <option key={value}>{value}</option>)}</select></label><label className="block space-y-2"><span className={dashLabel}>Title</span><input required value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} className="w-full border border-charcoal/15 bg-cream px-3 py-3 font-heading text-sm" /></label><label className="block space-y-2"><span className={dashLabel}>Details</span><textarea value={body} onChange={(event) => setBody(event.target.value)} rows={4} className="w-full resize-none border border-charcoal/15 bg-cream px-3 py-3 font-heading text-sm" /></label><label className="block space-y-2"><span className={dashLabel}>Function</span><select value={eventId} onChange={(event) => setEventId(event.target.value)} className="w-full border border-charcoal/15 bg-cream px-3 py-3 font-heading text-sm"><option value="">Whole event</option>{functions.map((item) => <option key={item.id} value={item.id}>{item.dayName} · {item.name}</option>)}</select></label><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1"><label className="block space-y-2"><span className={dashLabel}>Department</span><select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} className="w-full border border-charcoal/15 bg-cream px-3 py-3 font-heading text-sm"><option value="">All departments</option>{workspace.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label><label className="block space-y-2"><span className={dashLabel}>Zone</span><select value={zoneId} onChange={(event) => setZoneId(event.target.value)} className="w-full border border-charcoal/15 bg-cream px-3 py-3 font-heading text-sm"><option value="">All zones</option>{workspace.zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></label></div><label className="block space-y-2"><span className={dashLabel}>Owner</span><select value={assigneeUserId} onChange={(event) => setAssigneeUserId(event.target.value)} className="w-full border border-charcoal/15 bg-cream px-3 py-3 font-heading text-sm"><option value="">Unassigned</option>{workspace.team.map((member) => <option key={member.userId} value={member.userId}>{member.name} · {member.eventRole}</option>)}</select></label><label className="block space-y-2"><span className={dashLabel}>Due by</span><input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="w-full border border-charcoal/15 bg-cream px-3 py-3 font-heading text-sm" /></label><button disabled={saving} className={cn(dashBtn, "w-full")}>{saving ? "Saving..." : "Post internal update"}</button></div></form> : <div className={cn(dashCard, "self-start")}><p className={dashLabel}>Read only</p><p className="mt-2 font-heading text-sm leading-6 text-slate">Your event role can read the live record but cannot post updates.</p></div>}<div className="space-y-3">{feed.map((item) => <article key={item.id} className={cn(dashCard, item.status === "RESOLVED" && "opacity-65")}><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex flex-wrap gap-2"><span className={severityClass(item.severity)}>{item.severity}</span><span className={cn(statusBadgeBase, "border-charcoal/12 text-slate")}>{item.kind}</span><span className={cn(statusBadgeBase, item.status === "RESOLVED" ? "border-dry-sage-2 text-dusty-olive" : "border-charcoal/12 text-charcoal")}>{item.status}</span></div><time className={dashLabel}>{dateLabel(item.createdAt, true)}</time></div><h2 className="mt-4 font-display text-2xl text-charcoal">{item.title}</h2>{item.body ? <p className="mt-2 font-heading text-sm leading-6 text-slate">{item.body}</p> : null}{item.departmentName || item.zoneName ? <div className="mt-3 flex flex-wrap gap-2">{item.departmentName ? <span className={cn(statusBadgeBase, "border-dry-sage-2/50 bg-dry-sage/15 text-dusty-olive")}>{item.departmentName}</span> : null}{item.zoneName ? <span className={cn(statusBadgeBase, "border-camel/45 bg-camel/8 text-saddle-brown")}>{item.zoneName}</span> : null}</div> : null}<div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-charcoal/8 pt-3 font-heading text-xs text-slate"><span>Reported by {item.reportedByName}{item.dueAt ? ` · due ${dateLabel(item.dueAt, true)}` : ""}</span>{canManageIncidents && item.status !== "RESOLVED" ? <div className="flex gap-2">{item.status === "OPEN" ? <button disabled={saving} type="button" onClick={() => changeStatus(item.id, "ACKNOWLEDGED")} className="font-accent text-[9px] uppercase tracking-[0.16em] text-gold-dark">Acknowledge</button> : null}<button disabled={saving} type="button" onClick={() => changeStatus(item.id, "RESOLVED")} className="font-accent text-[9px] uppercase tracking-[0.16em] text-dusty-olive">Resolve</button></div> : null}</div></article>)}{feed.length === 0 ? <div className="border border-dashed border-charcoal/15 bg-cream p-10 text-center"><Radio className="mx-auto h-8 w-8 text-camel" /><p className="mt-3 font-display text-2xl text-charcoal">The live record is clear</p><p className="mt-2 font-heading text-sm text-slate">Updates, decisions, incidents, and escalations will appear here.</p></div> : null}</div></div> : null}

      {tab === "crew" || tab === "briefings" ? <OperationsWorkforcePanel eventId={id} mode={tab} permissions={permissions} team={workspace.team.map((member) => ({ id: member.id, userId: member.userId, name: member.name, eventRole: member.eventRole, phone: member.phone }))} functions={functions.map((item) => ({ id: item.id, label: `${item.dayName} · ${item.name}` }))} departments={workspace.departments} zones={workspace.zones} shifts={workspace.shifts} briefings={workspace.briefings} onChanged={() => setReloadKey((value) => value + 1)} /> : null}
    </div>
  );
}
