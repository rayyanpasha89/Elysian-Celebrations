"use client";

import { FormEvent, useState } from "react";
import {
  AlertTriangle,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  LogIn,
  LogOut,
  MapPin,
  Megaphone,
  Plus,
  ShieldAlert,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  OPERATIONS_BRIEFING_PRIORITIES,
  type OperationsPermission,
  type OperationsShiftStatus,
} from "@/lib/operations";
import { dashBtn, dashCard, dashLabel, statusBadgeBase } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

export type OperationsDepartment = {
  id: string;
  name: string;
  code: string;
  color: string;
  leadAssignmentId: string | null;
  leadName: string | null;
};

export type OperationsZone = {
  id: string;
  name: string;
  code: string;
  capacity: number | null;
  meetingPoint: string | null;
  emergencyNotes: string | null;
};

export type OperationsShift = {
  id: string;
  assignmentId: string;
  staffUserId: string | null;
  staffName: string;
  staffPhone: string | null;
  eventId: string | null;
  eventName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  departmentColor: string | null;
  zoneId: string | null;
  zoneName: string | null;
  supervisorName: string | null;
  roleLabel: string;
  shiftStart: string;
  shiftEnd: string;
  status: OperationsShiftStatus;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  handoffNotes: string | null;
  isOwn: boolean;
};

export type OperationsBriefing = {
  id: string;
  eventId: string | null;
  eventName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  zoneId: string | null;
  zoneName: string | null;
  title: string;
  body: string;
  priority: "NORMAL" | "HIGH" | "CRITICAL";
  requiresAcknowledgement: boolean;
  publishedAt: string;
  expiresAt: string | null;
  acknowledgementCount: number;
  acknowledged: boolean;
};

type TeamMember = {
  id: string;
  userId: string;
  name: string;
  eventRole: string;
  phone: string | null;
};

type EventFunction = { id: string; label: string };

type Props = {
  eventId: string;
  mode: "crew" | "briefings";
  permissions: OperationsPermission[];
  team: TeamMember[];
  functions: EventFunction[];
  departments: OperationsDepartment[];
  zones: OperationsZone[];
  shifts: OperationsShift[];
  briefings: OperationsBriefing[];
  onChanged: () => void;
};

function localDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusTone(status: OperationsShiftStatus) {
  if (status === "CHECKED_IN") return "border-dry-sage-2/70 bg-dry-sage/20 text-dusty-olive";
  if (status === "CHECKED_OUT") return "border-charcoal/15 bg-charcoal/5 text-charcoal";
  if (status === "NO_SHOW") return "border-saddle-brown/40 bg-saddle-brown/8 text-saddle-brown";
  if (status === "CANCELLED") return "border-charcoal/10 text-slate line-through";
  return "border-camel/45 bg-camel/8 text-saddle-brown";
}

export function OperationsWorkforcePanel(props: Props) {
  const canManageStaff = props.permissions.includes("MANAGE_STAFF");
  const canPublish = props.permissions.includes("POST_INTERNAL_UPDATES");
  const [saving, setSaving] = useState(false);
  const [departmentName, setDepartmentName] = useState("");
  const [departmentCode, setDepartmentCode] = useState("");
  const [zoneName, setZoneName] = useState("");
  const [zoneCode, setZoneCode] = useState("");
  const [meetingPoint, setMeetingPoint] = useState("");
  const [staffUserIds, setStaffUserIds] = useState<string[]>(
    props.team[0]?.userId ? [props.team[0].userId] : []
  );
  const [functionId, setFunctionId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [roleLabel, setRoleLabel] = useState("");
  const [shiftStart, setShiftStart] = useState("");
  const [shiftEnd, setShiftEnd] = useState("");
  const [supervisorUserId, setSupervisorUserId] = useState("");
  const [handoffNotes, setHandoffNotes] = useState("");
  const [briefingTitle, setBriefingTitle] = useState("");
  const [briefingBody, setBriefingBody] = useState("");
  const [briefingPriority, setBriefingPriority] = useState<OperationsBriefing["priority"]>("NORMAL");
  const [briefingDepartmentId, setBriefingDepartmentId] = useState("");
  const [briefingZoneId, setBriefingZoneId] = useState("");
  const [briefingFunctionId, setBriefingFunctionId] = useState("");

  const request = async (method: "POST" | "PATCH", body: Record<string, unknown>) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/operations/events/${props.eventId}/workforce`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "The operations update could not be saved");
      props.onChanged();
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The operations update could not be saved");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const createDepartment = async (event: FormEvent) => {
    event.preventDefault();
    if (await request("POST", { action: "CREATE_DEPARTMENT", name: departmentName, code: departmentCode, color: "#656d4a" })) {
      setDepartmentName("");
      setDepartmentCode("");
      toast.success("Department added");
    }
  };

  const createZone = async (event: FormEvent) => {
    event.preventDefault();
    if (await request("POST", { action: "CREATE_ZONE", name: zoneName, code: zoneCode, meetingPoint })) {
      setZoneName("");
      setZoneCode("");
      setMeetingPoint("");
      toast.success("Zone added");
    }
  };

  const createShift = async (event: FormEvent) => {
    event.preventDefault();
    if (
      await request("POST", {
        action: "CREATE_SHIFT_BATCH",
        staffUserIds,
        eventId: functionId || null,
        departmentId: departmentId || null,
        zoneId: zoneId || null,
        supervisorUserId: supervisorUserId || null,
        roleLabel,
        shiftStart: new Date(shiftStart).toISOString(),
        shiftEnd: new Date(shiftEnd).toISOString(),
        handoffNotes: handoffNotes || null,
      })
    ) {
      setRoleLabel("");
      setShiftStart("");
      setShiftEnd("");
      setHandoffNotes("");
      toast.success(`${staffUserIds.length} crew shift${staffUserIds.length === 1 ? "" : "s"} scheduled`);
    }
  };

  const bootstrapStructure = async () => {
    if (await request("POST", { action: "BOOTSTRAP_STRUCTURE" })) {
      toast.success("Standard departments and zones are ready");
    }
  };

  const createBriefing = async (event: FormEvent) => {
    event.preventDefault();
    if (
      await request("POST", {
        action: "CREATE_BRIEFING",
        title: briefingTitle,
        body: briefingBody,
        priority: briefingPriority,
        departmentId: briefingDepartmentId || null,
        zoneId: briefingZoneId || null,
        eventId: briefingFunctionId || null,
        requiresAcknowledgement: true,
      })
    ) {
      setBriefingTitle("");
      setBriefingBody("");
      toast.success("Briefing published");
    }
  };

  const updateShift = async (shiftId: string, status: OperationsShiftStatus) => {
    if (await request("PATCH", { action: "UPDATE_SHIFT_STATUS", shiftId, status })) {
      toast.success(status === "CHECKED_IN" ? "Checked in" : status === "CHECKED_OUT" ? "Checked out" : "Shift updated");
    }
  };

  const acknowledge = async (briefingId: string) => {
    if (await request("PATCH", { action: "ACKNOWLEDGE_BRIEFING", briefingId })) {
      toast.success("Briefing acknowledged");
    }
  };

  if (props.mode === "briefings") {
    return (
      <div className="grid gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
        {canPublish ? (
          <form onSubmit={createBriefing} className={cn(dashCard, "self-start")}>
            <Megaphone className="h-6 w-6 text-camel" />
            <p className={cn(dashLabel, "mt-4")}>Command briefing</p>
            <h2 className="mt-2 font-display text-2xl text-charcoal">Publish one source of truth</h2>
            <p className="mt-2 font-heading text-xs leading-5 text-slate">Briefings stay attached to the event and show who has acknowledged them.</p>
            <div className="mt-5 space-y-3">
              <input required value={briefingTitle} onChange={(event) => setBriefingTitle(event.target.value)} placeholder="Briefing title" className="w-full border border-charcoal/15 bg-cream px-3 py-3 font-heading text-sm" />
              <textarea required rows={5} value={briefingBody} onChange={(event) => setBriefingBody(event.target.value)} placeholder="Clear instructions, call times, contingencies, and escalation path" className="w-full resize-none border border-charcoal/15 bg-cream px-3 py-3 font-heading text-sm" />
              <select value={briefingPriority} onChange={(event) => setBriefingPriority(event.target.value as OperationsBriefing["priority"])} className="w-full border border-charcoal/15 bg-cream px-3 py-3 font-heading text-sm">{OPERATIONS_BRIEFING_PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}</select>
              <select value={briefingDepartmentId} onChange={(event) => setBriefingDepartmentId(event.target.value)} className="w-full border border-charcoal/15 bg-cream px-3 py-3 font-heading text-sm"><option value="">All departments</option>{props.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select>
              <select value={briefingZoneId} onChange={(event) => setBriefingZoneId(event.target.value)} className="w-full border border-charcoal/15 bg-cream px-3 py-3 font-heading text-sm"><option value="">All zones</option>{props.zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select>
              <select value={briefingFunctionId} onChange={(event) => setBriefingFunctionId(event.target.value)} className="w-full border border-charcoal/15 bg-cream px-3 py-3 font-heading text-sm"><option value="">Whole event</option>{props.functions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
              <button disabled={saving} className={cn(dashBtn, "w-full")}>{saving ? "Publishing..." : "Publish briefing"}</button>
            </div>
          </form>
        ) : null}
        <div className={cn("space-y-3", !canPublish && "xl:col-span-2")}>
          {props.briefings.map((briefing) => (
            <article key={briefing.id} className={dashCard}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <span className={cn(statusBadgeBase, briefing.priority === "CRITICAL" ? "border-saddle-brown bg-saddle-brown/8 text-saddle-brown" : briefing.priority === "HIGH" ? "border-camel/60 text-saddle-brown" : "border-dry-sage-2/60 text-dusty-olive")}>{briefing.priority}</span>
                  {briefing.departmentName ? <span className={cn(statusBadgeBase, "border-charcoal/10 text-slate")}>{briefing.departmentName}</span> : null}
                  {briefing.zoneName ? <span className={cn(statusBadgeBase, "border-charcoal/10 text-slate")}>{briefing.zoneName}</span> : null}
                </div>
                <time className={dashLabel}>{localDateTime(briefing.publishedAt)}</time>
              </div>
              <h2 className="mt-4 font-display text-2xl text-charcoal">{briefing.title}</h2>
              <p className="mt-2 whitespace-pre-wrap font-heading text-sm leading-6 text-slate">{briefing.body}</p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-charcoal/8 pt-3">
                <span className="font-heading text-xs text-slate">{briefing.acknowledgementCount} acknowledgements{briefing.eventName ? ` · ${briefing.eventName}` : ""}</span>
                {briefing.requiresAcknowledgement && !briefing.acknowledged ? <button disabled={saving} type="button" onClick={() => acknowledge(briefing.id)} className="font-accent text-[10px] uppercase tracking-[0.18em] text-gold-dark">Acknowledge</button> : briefing.acknowledged ? <span className="inline-flex items-center gap-1 font-accent text-[9px] uppercase tracking-[0.16em] text-dusty-olive"><CheckCircle2 className="h-3.5 w-3.5" /> Read</span> : null}
              </div>
            </article>
          ))}
          {props.briefings.length === 0 ? <div className="border border-dashed border-charcoal/15 bg-cream p-10 text-center"><Megaphone className="mx-auto h-8 w-8 text-camel" /><h2 className="mt-3 font-display text-2xl text-charcoal">No briefings published</h2><p className="mt-2 font-heading text-sm text-slate">Publish the first call sheet, safety note, or operational change.</p></div> : null}
        </div>
      </div>
    );
  }

  const checkedIn = props.shifts.filter((shift) => shift.status === "CHECKED_IN").length;
  const unscheduled = props.team.filter((member) => !props.shifts.some((shift) => shift.staffUserId === member.userId && shift.status !== "CANCELLED")).length;
  const ownShifts = props.shifts.filter((shift) => shift.isOwn && shift.status !== "CANCELLED");

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [Users, "Event crew", props.team.length, "Active event access"],
          [Clock3, "Scheduled shifts", props.shifts.filter((shift) => shift.status !== "CANCELLED").length, "Multiple shifts supported"],
          [LogIn, "On site", checkedIn, "Checked in now"],
          [ShieldAlert, "Coverage gaps", unscheduled, "Members without a shift"],
        ].map(([Icon, label, value, detail]) => {
          const MetricIcon = Icon as typeof Users;
          return <article key={String(label)} className={dashCard}><MetricIcon className="h-5 w-5 text-camel" /><p className={cn(dashLabel, "mt-4")}>{String(label)}</p><p className="mt-2 font-display text-3xl text-charcoal">{String(value)}</p><p className="mt-1 font-heading text-xs text-slate">{String(detail)}</p></article>;
        })}
      </div>

      {ownShifts.length ? <section className="border border-dry-sage-2/45 bg-dry-sage/12 p-5"><p className={dashLabel}>My event desk</p><div className="mt-3 grid gap-3 lg:grid-cols-2">{ownShifts.map((shift) => <article key={shift.id} className="border border-charcoal/8 bg-ivory/80 p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-display text-xl text-charcoal">{shift.roleLabel}</h2><p className="mt-1 font-heading text-xs text-slate">{shift.departmentName ?? "General operations"} · {shift.zoneName ?? "Event-wide"}</p></div><span className={cn(statusBadgeBase, statusTone(shift.status))}>{shift.status.replaceAll("_", " ")}</span></div><p className="mt-3 font-heading text-xs text-slate">{localDateTime(shift.shiftStart)} – {localDateTime(shift.shiftEnd)}</p><div className="mt-4 flex gap-3">{shift.status === "PLANNED" ? <button disabled={saving} type="button" onClick={() => updateShift(shift.id, "CHECKED_IN")} className="inline-flex items-center gap-1 font-accent text-[10px] uppercase tracking-[0.16em] text-dusty-olive"><LogIn className="h-3.5 w-3.5" /> Check in</button> : null}{shift.status === "CHECKED_IN" ? <button disabled={saving} type="button" onClick={() => updateShift(shift.id, "CHECKED_OUT")} className="inline-flex items-center gap-1 font-accent text-[10px] uppercase tracking-[0.16em] text-saddle-brown"><LogOut className="h-3.5 w-3.5" /> Check out</button> : null}</div></article>)}</div></section> : null}

      {canManageStaff ? <details className={dashCard}><summary className="cursor-pointer list-none"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className={dashLabel}>Workforce setup</p><h2 className="mt-2 font-display text-2xl text-charcoal">Departments, zones, and shifts</h2></div><div className="flex items-center gap-3"><button type="button" disabled={saving} onClick={(event) => { event.preventDefault(); void bootstrapStructure(); }} className="border border-dusty-olive/35 px-3 py-2 font-accent text-[9px] uppercase tracking-[0.14em] text-dusty-olive">Load standard structure</button><Plus className="h-5 w-5 text-camel" /></div></div></summary><div className="mt-6 grid gap-5 border-t border-charcoal/8 pt-5 xl:grid-cols-3"><form onSubmit={createDepartment} className="space-y-3"><BriefcaseBusiness className="h-5 w-5 text-camel" /><p className={dashLabel}>New department</p><input required value={departmentName} onChange={(event) => setDepartmentName(event.target.value)} placeholder="Guest experience" className="w-full border border-charcoal/15 bg-cream px-3 py-3 font-heading text-sm" /><input required value={departmentCode} onChange={(event) => setDepartmentCode(event.target.value)} placeholder="GUEST" className="w-full border border-charcoal/15 bg-cream px-3 py-3 font-heading text-sm uppercase" /><button disabled={saving} className={cn(dashBtn, "w-full")}>Add department</button></form><form onSubmit={createZone} className="space-y-3"><MapPin className="h-5 w-5 text-camel" /><p className={dashLabel}>New zone</p><input required value={zoneName} onChange={(event) => setZoneName(event.target.value)} placeholder="Arrival lobby" className="w-full border border-charcoal/15 bg-cream px-3 py-3 font-heading text-sm" /><input required value={zoneCode} onChange={(event) => setZoneCode(event.target.value)} placeholder="ARRIVAL" className="w-full border border-charcoal/15 bg-cream px-3 py-3 font-heading text-sm uppercase" /><input value={meetingPoint} onChange={(event) => setMeetingPoint(event.target.value)} placeholder="Meeting point" className="w-full border border-charcoal/15 bg-cream px-3 py-3 font-heading text-sm" /><button disabled={saving} className={cn(dashBtn, "w-full")}>Add zone</button></form><form onSubmit={createShift} className="space-y-3 xl:row-span-2"><Clock3 className="h-5 w-5 text-camel" /><p className={dashLabel}>Schedule crew shift</p><label className="block space-y-2"><span className="font-heading text-xs text-slate">Select one or many crew members</span><select multiple required value={staffUserIds} onChange={(event) => setStaffUserIds(Array.from(event.currentTarget.selectedOptions, (option) => option.value))} size={Math.min(7, Math.max(3, props.team.length))} className="w-full border border-charcoal/15 bg-cream px-3 py-2 font-heading text-sm">{props.team.map((member) => <option key={member.userId} value={member.userId}>{member.name} · {member.eventRole}</option>)}</select></label><input required value={roleLabel} onChange={(event) => setRoleLabel(event.target.value)} placeholder="Shift role" className="w-full border border-charcoal/15 bg-cream px-3 py-3 font-heading text-sm" /><div className="grid gap-3 sm:grid-cols-2"><input required type="datetime-local" value={shiftStart} onChange={(event) => setShiftStart(event.target.value)} className="w-full border border-charcoal/15 bg-cream px-3 py-3 font-heading text-xs" /><input required type="datetime-local" value={shiftEnd} onChange={(event) => setShiftEnd(event.target.value)} className="w-full border border-charcoal/15 bg-cream px-3 py-3 font-heading text-xs" /></div><select value={functionId} onChange={(event) => setFunctionId(event.target.value)} className="w-full border border-charcoal/15 bg-cream px-3 py-3 font-heading text-sm"><option value="">Whole event</option>{props.functions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><div className="grid gap-3 sm:grid-cols-2"><select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} className="w-full border border-charcoal/15 bg-cream px-3 py-3 font-heading text-sm"><option value="">Department</option>{props.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select><select value={zoneId} onChange={(event) => setZoneId(event.target.value)} className="w-full border border-charcoal/15 bg-cream px-3 py-3 font-heading text-sm"><option value="">Zone</option>{props.zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></div><select value={supervisorUserId} onChange={(event) => setSupervisorUserId(event.target.value)} className="w-full border border-charcoal/15 bg-cream px-3 py-3 font-heading text-sm"><option value="">No direct supervisor</option>{props.team.filter((member) => !staffUserIds.includes(member.userId)).map((member) => <option key={member.userId} value={member.userId}>{member.name}</option>)}</select><textarea rows={3} value={handoffNotes} onChange={(event) => setHandoffNotes(event.target.value)} placeholder="Handoff, radio channel, uniform, or contingency notes" className="w-full resize-none border border-charcoal/15 bg-cream px-3 py-3 font-heading text-sm" /><button disabled={saving || staffUserIds.length === 0} className={cn(dashBtn, "w-full")}>Schedule {staffUserIds.length || ""} shift{staffUserIds.length === 1 ? "" : "s"}</button></form></div></details> : null}

      <section className={dashCard}>
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className={dashLabel}>Live roster</p><h2 className="mt-2 font-display text-2xl text-charcoal">Coverage by person, place, and time</h2></div><span className="font-heading text-xs text-slate">{props.departments.length} departments · {props.zones.length} zones</span></div>
        <div className="mt-5 overflow-x-auto"><table className="min-w-[880px] w-full border-collapse text-left"><thead><tr className="border-b border-charcoal/10">{["Crew member", "Role", "Department / zone", "Function", "Shift", "Status", "Action"].map((heading) => <th key={heading} className="px-3 py-3 font-accent text-[9px] uppercase tracking-[0.18em] text-slate">{heading}</th>)}</tr></thead><tbody>{props.shifts.map((shift) => <tr key={shift.id} className="border-b border-charcoal/7"><td className="px-3 py-4"><p className="font-heading text-sm font-semibold text-charcoal">{shift.staffName}</p>{shift.staffPhone ? <p className="font-heading text-[10px] text-slate">{shift.staffPhone}</p> : null}</td><td className="px-3 py-4 font-heading text-xs text-charcoal">{shift.roleLabel}{shift.supervisorName ? <span className="block text-[10px] text-slate">Reports to {shift.supervisorName}</span> : null}</td><td className="px-3 py-4 font-heading text-xs text-charcoal">{shift.departmentName ?? "General"}<span className="block text-[10px] text-slate">{shift.zoneName ?? "Event-wide"}</span></td><td className="px-3 py-4 font-heading text-xs text-charcoal">{shift.eventName ?? "Whole event"}</td><td className="px-3 py-4 font-heading text-xs text-charcoal">{localDateTime(shift.shiftStart)}<span className="block text-[10px] text-slate">to {localDateTime(shift.shiftEnd)}</span></td><td className="px-3 py-4"><span className={cn(statusBadgeBase, statusTone(shift.status))}>{shift.status.replaceAll("_", " ")}</span></td><td className="px-3 py-4">{(canManageStaff || shift.isOwn) && shift.status === "PLANNED" ? <button disabled={saving} type="button" onClick={() => updateShift(shift.id, "CHECKED_IN")} className="font-accent text-[9px] uppercase tracking-[0.16em] text-dusty-olive">Check in</button> : null}{(canManageStaff || shift.isOwn) && shift.status === "CHECKED_IN" ? <button disabled={saving} type="button" onClick={() => updateShift(shift.id, "CHECKED_OUT")} className="font-accent text-[9px] uppercase tracking-[0.16em] text-saddle-brown">Check out</button> : null}</td></tr>)}{props.shifts.length === 0 ? <tr><td colSpan={7} className="px-3 py-12 text-center font-heading text-sm text-slate">No shifts scheduled. Open Workforce setup to map the first crew call.</td></tr> : null}</tbody></table></div>
      </section>

      {unscheduled > 0 ? <div className="flex gap-3 border border-camel/35 bg-camel/8 p-4"><AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-saddle-brown" /><div><p className="font-heading text-sm font-semibold text-charcoal">{unscheduled} crew member{unscheduled === 1 ? "" : "s"} still need a shift</p><p className="mt-1 font-heading text-xs text-slate">Every active event member should have at least one time and zone assignment before doors open.</p></div></div> : null}
    </div>
  );
}
