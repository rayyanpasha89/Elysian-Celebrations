"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarRange, Check, ShieldCheck, UserRoundCog } from "lucide-react";
import { toast } from "sonner";
import { DashboardLoadError } from "@/components/dashboard/dashboard-load-error";
import {
  OPERATIONS_PERMISSIONS,
  OPERATIONS_ROLE_TEMPLATES,
  templatePermissions,
  type OperationsPermission,
  type OperationsRoleTemplate,
} from "@/lib/operations";
import { dashBtn, dashCard, dashLabel, statusBadgeBase } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type StaffProfile = {
  user_id: string;
  role_template: OperationsRoleTemplate;
  job_title: string | null;
  phone: string | null;
  permissions: OperationsPermission[];
  is_active: boolean;
};

type Assignment = {
  id: string;
  wedding_id: string;
  staff_user_id: string;
  event_role: string | null;
  permissions: OperationsPermission[] | null;
  shift_start: string | null;
  shift_end: string | null;
  notes: string | null;
  is_active: boolean;
};

type StaffMember = {
  id: string;
  name: string;
  email: string;
  accountPhone: string | null;
  avatar: string | null;
  accountActive: boolean;
  profile: StaffProfile | null;
  assignments: Assignment[];
};

type EventOption = {
  id: string;
  name: string;
  date: string | null;
  status: string;
  eventType: string;
  destination: string | null;
};

type Payload = { staff: StaffMember[]; events: EventOption[] };

const PERMISSION_COPY: Record<OperationsPermission, string> = {
  VIEW_EVENT: "Open assigned event workspaces",
  EDIT_RUN_OF_SHOW: "Edit the run of show",
  MANAGE_TASKS: "Manage event tasks",
  MANAGE_INCIDENTS: "Open and resolve incidents",
  POST_INTERNAL_UPDATES: "Post internal updates and decisions",
  MESSAGE_CLIENT: "Use client communication tools",
  MESSAGE_VENDORS: "Use vendor communication tools",
  VIEW_FINANCIALS: "View published client totals and collections",
  MANAGE_STAFF: "Manage the assigned event team",
  PRINT_EVENT_BOOK: "Print the event operations book",
};

function formatDate(value: string | null) {
  if (!value) return "Date not set";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function inputDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export default function AdminTeamPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [roleTemplate, setRoleTemplate] = useState<OperationsRoleTemplate>("COORDINATOR");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [profileActive, setProfileActive] = useState(true);
  const [permissions, setPermissions] = useState<OperationsPermission[]>(
    templatePermissions("COORDINATOR")
  );
  const [eventRole, setEventRole] = useState("");
  const [shiftStart, setShiftStart] = useState("");
  const [shiftEnd, setShiftEnd] = useState("");
  const [assignmentNotes, setAssignmentNotes] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/team", { cache: "no-store" });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error ?? "Could not load the team");
    return json as Payload;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        setLoadError(false);
        const next = await load();
        if (cancelled) return;
        setData(next);
        setSelectedId((current) => current ?? next.staff[0]?.id ?? null);
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

  const selected = useMemo(
    () => data?.staff.find((staff) => staff.id === selectedId) ?? null,
    [data, selectedId]
  );
  const selectedAssignment = useMemo(
    () =>
      selected?.assignments.find(
        (assignment) => assignment.wedding_id === selectedEventId
      ) ?? null,
    [selected, selectedEventId]
  );

  useEffect(() => {
    const profile = selected?.profile;
    const template = profile?.role_template ?? "COORDINATOR";
    setRoleTemplate(template);
    setJobTitle(profile?.job_title ?? "");
    setPhone(profile?.phone ?? selected?.accountPhone ?? "");
    setProfileActive(profile?.is_active ?? true);
    setPermissions(
      profile?.permissions?.length
        ? profile.permissions
        : templatePermissions(template)
    );
    setSelectedEventId(null);
  }, [selected]);

  useEffect(() => {
    setEventRole(selectedAssignment?.event_role ?? "Event coordinator");
    setShiftStart(inputDateTime(selectedAssignment?.shift_start ?? null));
    setShiftEnd(inputDateTime(selectedAssignment?.shift_end ?? null));
    setAssignmentNotes(selectedAssignment?.notes ?? "");
  }, [selectedAssignment]);

  const refresh = async (keepEvent = true) => {
    const next = await load();
    setData(next);
    if (!keepEvent) setSelectedEventId(null);
  };

  const saveProfile = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const response = await fetch("/api/admin/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "PROFILE",
          userId: selected.id,
          roleTemplate,
          jobTitle,
          phone,
          permissions,
          isActive: profileActive,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Profile could not be saved");
      await refresh();
      toast.success("Employee permissions saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Profile could not be saved");
    } finally {
      setSaving(false);
    }
  };

  const saveAssignment = async (isActive: boolean) => {
    if (!selected || !selectedEventId) return;
    setSaving(true);
    try {
      const response = await fetch("/api/admin/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ASSIGNMENT",
          userId: selected.id,
          eventId: selectedEventId,
          eventRole,
          shiftStart: shiftStart || null,
          shiftEnd: shiftEnd || null,
          notes: assignmentNotes,
          permissions: null,
          isActive,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Assignment could not be saved");
      await refresh();
      toast.success(isActive ? "Event assignment saved" : "Event access removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Assignment could not be saved");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl animate-pulse space-y-5">
        <div className="h-36 bg-charcoal/5" />
        <div className="grid gap-5 lg:grid-cols-[20rem_1fr]">
          <div className="h-96 bg-charcoal/5" />
          <div className="h-96 bg-charcoal/5" />
        </div>
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <DashboardLoadError
        eyebrow="Operations control"
        pageTitle="Team & Permissions"
        label="Team controls unavailable"
        title="We could not load employee access"
        description="Retry before changing any account or event assignment. Existing permissions remain unchanged."
        onRetry={() => setReloadKey((value) => value + 1)}
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="relative overflow-hidden border border-charcoal/10 bg-midnight p-7 text-ivory md:p-9">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(166,138,100,0.28),transparent_55%)]" />
        <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="font-accent text-[10px] uppercase tracking-[0.24em] text-khaki-beige">
              Operations control
            </p>
            <h1 className="mt-3 max-w-3xl font-display text-4xl text-ivory md:text-5xl">
              Give every employee exactly the event access they need.
            </h1>
            <p className="mt-4 max-w-2xl font-heading text-sm leading-7 text-ivory/68">
              Role templates establish capabilities. Event assignments decide where those capabilities apply.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px border border-ivory/10 bg-ivory/10">
            <div className="bg-midnight/80 px-5 py-4">
              <p className="font-display text-3xl">{data.staff.length}</p>
              <p className="mt-1 font-accent text-[9px] uppercase tracking-[0.2em] text-ivory/45">Employees</p>
            </div>
            <div className="bg-midnight/80 px-5 py-4">
              <p className="font-display text-3xl">{data.events.length}</p>
              <p className="mt-1 font-accent text-[9px] uppercase tracking-[0.2em] text-ivory/45">Live plans</p>
            </div>
          </div>
        </div>
      </section>

      {data.staff.length === 0 ? (
        <section className={cn(dashCard, "border-dashed py-12 text-center")}>
          <UserRoundCog className="mx-auto h-8 w-8 text-gold-primary" />
          <h2 className="mt-4 font-display text-2xl text-charcoal">Create the employee account first</h2>
          <p className="mx-auto mt-2 max-w-xl font-heading text-sm leading-6 text-slate">
            Change an existing account to the Manager role in Users. It will then appear here for operational permissions and event assignment.
          </p>
        </section>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
          <aside className={cn(dashCard, "self-start p-0")}>
            <div className="border-b border-charcoal/8 p-5">
              <p className={dashLabel}>Operations employees</p>
              <p className="mt-2 font-heading text-xs text-slate">Choose a person to configure.</p>
            </div>
            <div className="divide-y divide-charcoal/6">
              {data.staff.map((staff) => {
                const active = staff.id === selectedId;
                const activeAssignments = staff.assignments.filter((item) => item.is_active).length;
                return (
                  <button
                    key={staff.id}
                    type="button"
                    onClick={() => setSelectedId(staff.id)}
                    className={cn(
                      "w-full px-5 py-4 text-left transition-colors",
                      active ? "bg-khaki-beige/22" : "hover:bg-cream"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-heading text-sm font-semibold text-charcoal">{staff.name}</p>
                        <p className="mt-1 truncate font-heading text-xs text-slate">{staff.email}</p>
                      </div>
                      <span className={cn(statusBadgeBase, staff.profile?.is_active ? "border-dry-sage-2 text-dusty-olive" : "border-charcoal/15 text-slate")}>
                        {staff.profile ? `${activeAssignments} events` : "Set up"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {selected ? (
            <div className="space-y-6">
              <section className={dashCard}>
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-charcoal/8 pb-5">
                  <div>
                    <p className={dashLabel}>Capability profile</p>
                    <h2 className="mt-2 font-display text-3xl text-charcoal">{selected.name}</h2>
                    <p className="mt-1 font-heading text-sm text-slate">{selected.email}</p>
                  </div>
                  <label className="flex items-center gap-3 font-accent text-[10px] uppercase tracking-[0.18em] text-charcoal">
                    <input
                      type="checkbox"
                      checked={profileActive}
                      onChange={(event) => setProfileActive(event.target.checked)}
                      className="h-4 w-4 accent-dusty-olive"
                    />
                    Employee active
                  </label>
                </div>

                <div className="mt-5 grid gap-5 md:grid-cols-3">
                  <label className="space-y-2">
                    <span className={dashLabel}>Role template</span>
                    <select
                      value={roleTemplate}
                      onChange={(event) => {
                        const next = event.target.value as OperationsRoleTemplate;
                        setRoleTemplate(next);
                        setPermissions(templatePermissions(next));
                      }}
                      className="w-full border border-charcoal/15 bg-cream px-4 py-3 font-heading text-sm text-charcoal outline-none focus:border-gold-primary"
                    >
                      {Object.entries(OPERATIONS_ROLE_TEMPLATES).map(([key, value]) => (
                        <option key={key} value={key}>{value.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className={dashLabel}>Display title</span>
                    <input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} placeholder="Senior event coordinator" className="w-full border border-charcoal/15 bg-cream px-4 py-3 font-heading text-sm outline-none focus:border-gold-primary" />
                  </label>
                  <label className="space-y-2">
                    <span className={dashLabel}>Operations phone</span>
                    <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91..." className="w-full border border-charcoal/15 bg-cream px-4 py-3 font-heading text-sm outline-none focus:border-gold-primary" />
                  </label>
                </div>

                <div className="mt-6">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className={dashLabel}>Effective capabilities</p>
                      <p className="mt-1 font-heading text-xs text-slate">Start from a role template, then remove capabilities this employee should not have.</p>
                    </div>
                    <button type="button" onClick={() => setPermissions(templatePermissions(roleTemplate))} className="font-accent text-[9px] uppercase tracking-[0.18em] text-gold-dark">Reset template</button>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {OPERATIONS_PERMISSIONS.map((permission) => {
                      const checked = permissions.includes(permission);
                      return (
                        <label key={permission} className={cn("flex cursor-pointer gap-3 border p-3 transition-colors", checked ? "border-dry-sage-2/60 bg-dry-sage/18" : "border-charcoal/8 bg-cream/40")}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setPermissions((current) => checked ? current.filter((item) => item !== permission) : [...current, permission])}
                            className="mt-0.5 h-4 w-4 accent-dusty-olive"
                          />
                          <span>
                            <span className="block font-accent text-[9px] uppercase tracking-[0.16em] text-charcoal">{permission.replaceAll("_", " ")}</span>
                            <span className="mt-1 block font-heading text-xs leading-5 text-slate">{PERMISSION_COPY[permission]}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <button type="button" disabled={saving} onClick={saveProfile} className={dashBtn}>{saving ? "Saving..." : "Save employee profile"}</button>
                </div>
              </section>

              <section className={dashCard}>
                <div className="flex items-center gap-3">
                  <CalendarRange className="h-5 w-5 text-gold-dark" />
                  <div>
                    <p className={dashLabel}>Event scope</p>
                    <h2 className="mt-1 font-display text-2xl text-charcoal">Assigned events</h2>
                  </div>
                </div>
                {!selected.profile ? (
                  <div className="mt-5 border border-dashed border-gold-primary/35 bg-cream p-5 font-heading text-sm text-slate">
                    Save the employee profile before assigning an event.
                  </div>
                ) : (
                  <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.75fr)]">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {data.events.map((event) => {
                        const assignment = selected.assignments.find((item) => item.wedding_id === event.id);
                        const active = assignment?.is_active ?? false;
                        const selectedEvent = selectedEventId === event.id;
                        return (
                          <button key={event.id} type="button" onClick={() => setSelectedEventId(event.id)} className={cn("border p-4 text-left transition-all", selectedEvent ? "border-gold-primary bg-khaki-beige/16 shadow-[0_14px_40px_rgba(88,47,14,0.08)]" : "border-charcoal/8 hover:border-camel/50")}>
                            <div className="flex items-start justify-between gap-3">
                              <span className={cn("flex h-6 w-6 items-center justify-center rounded-full border", active ? "border-dusty-olive bg-dry-sage text-charcoal-brown" : "border-charcoal/15 text-transparent")}><Check className="h-3.5 w-3.5" /></span>
                              <span className={cn(statusBadgeBase, "border-charcoal/10 text-slate")}>{event.status}</span>
                            </div>
                            <p className="mt-4 font-display text-xl text-charcoal">{event.name}</p>
                            <p className="mt-1 font-heading text-xs text-slate">{event.eventType} · {formatDate(event.date)}</p>
                            <p className="mt-1 font-heading text-xs text-slate">{event.destination ?? "Destination pending"}</p>
                          </button>
                        );
                      })}
                    </div>

                    <div className="border border-charcoal/8 bg-cream/55 p-5">
                      {selectedEventId ? (
                        <div className="space-y-4">
                          <div>
                            <p className={dashLabel}>Assignment details</p>
                            <h3 className="mt-2 font-display text-xl text-charcoal">{data.events.find((event) => event.id === selectedEventId)?.name}</h3>
                          </div>
                          <label className="block space-y-2"><span className={dashLabel}>Event role</span><input value={eventRole} onChange={(event) => setEventRole(event.target.value)} className="w-full border border-charcoal/15 bg-ivory px-3 py-2.5 font-heading text-sm outline-none focus:border-gold-primary" /></label>
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
                            <label className="space-y-2"><span className={dashLabel}>Shift starts</span><input type="datetime-local" value={shiftStart} onChange={(event) => setShiftStart(event.target.value)} className="w-full border border-charcoal/15 bg-ivory px-3 py-2.5 font-heading text-xs outline-none focus:border-gold-primary" /></label>
                            <label className="space-y-2"><span className={dashLabel}>Shift ends</span><input type="datetime-local" value={shiftEnd} onChange={(event) => setShiftEnd(event.target.value)} className="w-full border border-charcoal/15 bg-ivory px-3 py-2.5 font-heading text-xs outline-none focus:border-gold-primary" /></label>
                          </div>
                          <label className="block space-y-2"><span className={dashLabel}>Handoff notes</span><textarea value={assignmentNotes} onChange={(event) => setAssignmentNotes(event.target.value)} rows={3} className="w-full resize-none border border-charcoal/15 bg-ivory px-3 py-2.5 font-heading text-sm outline-none focus:border-gold-primary" /></label>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" disabled={saving} onClick={() => saveAssignment(true)} className={dashBtn}>{selectedAssignment?.is_active ? "Update assignment" : "Assign to event"}</button>
                            {selectedAssignment?.is_active ? <button type="button" disabled={saving} onClick={() => saveAssignment(false)} className="font-accent border border-charcoal/15 px-4 py-3 text-[10px] uppercase tracking-[0.16em] text-slate hover:border-saddle-brown hover:text-saddle-brown">Remove access</button> : null}
                          </div>
                          <div className="flex gap-2 border-t border-charcoal/8 pt-4 font-heading text-xs leading-5 text-slate"><ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-dusty-olive" /><span>This assignment inherits the employee capabilities above and exposes only this event.</span></div>
                        </div>
                      ) : (
                        <div className="flex min-h-64 flex-col items-center justify-center text-center">
                          <CalendarRange className="h-8 w-8 text-camel" />
                          <p className="mt-4 font-display text-xl text-charcoal">Choose an event</p>
                          <p className="mt-2 max-w-xs font-heading text-xs leading-5 text-slate">Assignments, shift windows, and handoff notes are configured per event.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
