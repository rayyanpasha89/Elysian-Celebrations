"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  FolderKanban,
  Link2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  PRODUCTION_RECORD_TYPES,
  PRODUCTION_STATUSES,
  PRODUCTION_VISIBILITIES,
  productionTypeMeta,
  type ProductionGroup,
  type ProductionRecordType,
  type ProductionStatus,
  type ProductionVisibility,
} from "@/lib/event-production";
import type { OperationsPermission } from "@/lib/operations";
import { dashBtn, dashCard, dashLabel, statusBadgeBase } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type Option = { id: string; label: string };
type Attachment = {
  id: string;
  title: string;
  url: string;
  classification: "CLIENT" | "INTERNAL" | "FINANCE" | "PRIVATE_IDENTITY";
};
type ProductionRecord = {
  id: string;
  wedding_event_id: string | null;
  record_type: ProductionRecordType;
  title: string;
  description: string | null;
  status: ProductionStatus;
  visibility: ProductionVisibility;
  department_id: string | null;
  zone_id: string | null;
  owner_assignment_id: string | null;
  owner_label: string | null;
  due_at: string | null;
  amount: number | null;
  currency: string;
  payload: Record<string, unknown> | null;
  version: number;
  created_at: string;
  updated_at: string;
  attachments: Attachment[];
  activity: { id: string; action: string; created_at: string }[];
};
type ProductionResponse = {
  records: ProductionRecord[];
  permissions: { canManage: boolean; canViewFinancials: boolean };
};

type Props = {
  eventId: string;
  permissions: OperationsPermission[];
  functions: Option[];
  departments: Option[];
  zones: Option[];
  team: { id: string; name: string; eventRole: string }[];
};

const GROUPS: { value: "all" | ProductionGroup; label: string }[] = [
  { value: "all", label: "All records" },
  { value: "procurement", label: "Procurement" },
  { value: "documents", label: "Documents" },
  { value: "compliance", label: "Compliance" },
  { value: "travel", label: "Travel & rooming" },
  { value: "communications", label: "Communications" },
  { value: "inventory", label: "Inventory & packing" },
  { value: "finance", label: "Field finance" },
  { value: "family", label: "Family & VIP" },
];

const CLASSIFICATIONS = ["CLIENT", "INTERNAL", "FINANCE", "PRIVATE_IDENTITY"] as const;

function displayEnum(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

function dateLabel(value: string | null) {
  if (!value) return "No deadline";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function money(value: number | null, currency: string) {
  if (value == null) return null;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function statusClass(status: ProductionStatus) {
  return cn(
    statusBadgeBase,
    status === "DONE" && "border-dry-sage-2/70 bg-dry-sage/20 text-dusty-olive",
    status === "APPROVED" && "border-dusty-olive/45 bg-dry-sage/15 text-dusty-olive",
    status === "IN_PROGRESS" && "border-camel/60 bg-camel/10 text-saddle-brown",
    status === "WAITING" && "border-toffee-brown/45 bg-toffee-brown/8 text-toffee-brown",
    status === "OPEN" && "border-charcoal/15 text-charcoal",
    status === "CANCELLED" && "border-charcoal/10 text-slate opacity-65"
  );
}

export function OperationsProductionPanel(props: Props) {
  const [data, setData] = useState<ProductionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [group, setGroup] = useState<"all" | ProductionGroup>("all");
  const [query, setQuery] = useState("");
  const [recordType, setRecordType] = useState<ProductionRecordType>("DOCUMENT");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProductionStatus>("OPEN");
  const [visibility, setVisibility] = useState<ProductionVisibility>("OPERATIONS");
  const [functionId, setFunctionId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [ownerAssignmentId, setOwnerAssignmentId] = useState("");
  const [ownerLabel, setOwnerLabel] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [amount, setAmount] = useState("");
  const [details, setDetails] = useState("");
  const [attachmentTitle, setAttachmentTitle] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentClassification, setAttachmentClassification] = useState<(typeof CLASSIFICATIONS)[number]>("INTERNAL");
  const [linkDrafts, setLinkDrafts] = useState<Record<string, { title: string; url: string; classification: Attachment["classification"] }>>({});

  const load = useCallback(async () => {
    const response = await fetch(`/api/operations/events/${props.eventId}/production`, {
      cache: "no-store",
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error ?? "Production dossier could not be loaded");
    setData(json as ProductionResponse);
  }, [props.eventId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        await load();
      } catch (error) {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Production dossier could not be loaded");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const records = useMemo(() => data?.records ?? [], [data?.records]);
  const canManage = data?.permissions.canManage ?? props.permissions.includes("MANAGE_PRODUCTION");
  const canViewFinancials = data?.permissions.canViewFinancials ?? props.permissions.includes("VIEW_FINANCIALS");
  const now = Date.now();
  const metrics = useMemo(() => ({
    active: records.filter((record) => !["DONE", "CANCELLED"].includes(record.status)).length,
    overdue: records.filter((record) => record.due_at && new Date(record.due_at).getTime() < now && !["DONE", "CANCELLED"].includes(record.status)).length,
    approvals: records.filter((record) => record.record_type === "APPROVAL" && record.status !== "APPROVED").length,
    references: records.reduce((sum, record) => sum + record.attachments.length, 0),
  }), [now, records]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return records.filter((record) => {
      const meta = productionTypeMeta(record.record_type);
      if (group !== "all" && meta.group !== group) return false;
      if (!needle) return true;
      return [record.title, record.description, record.owner_label, meta.label]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [group, query, records]);

  const resetForm = () => {
    setRecordType("DOCUMENT");
    setTitle("");
    setDescription("");
    setStatus("OPEN");
    setVisibility("OPERATIONS");
    setFunctionId("");
    setDepartmentId("");
    setZoneId("");
    setOwnerAssignmentId("");
    setOwnerLabel("");
    setDueAt("");
    setAmount("");
    setDetails("");
    setAttachmentTitle("");
    setAttachmentUrl("");
    setAttachmentClassification("INTERNAL");
  };

  const createRecord = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const attachments = attachmentTitle || attachmentUrl
        ? [{ title: attachmentTitle, url: attachmentUrl, classification: attachmentClassification }]
        : [];
      const response = await fetch(`/api/operations/events/${props.eventId}/production`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordType,
          title,
          description,
          status,
          visibility,
          eventId: functionId || null,
          departmentId: departmentId || null,
          zoneId: zoneId || null,
          ownerAssignmentId: ownerAssignmentId || null,
          ownerLabel,
          dueAt: dueAt || null,
          amount: amount || null,
          currency: "INR",
          payload: details.trim() ? { notes: details.trim() } : {},
          attachments,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Production record could not be saved");
      resetForm();
      await load();
      toast.success("Production record added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Production record could not be saved");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (record: ProductionRecord, nextStatus: ProductionStatus) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/operations/events/${props.eventId}/production/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordType: record.record_type,
          title: record.title,
          description: record.description,
          status: nextStatus,
          visibility: record.visibility,
          eventId: record.wedding_event_id,
          departmentId: record.department_id,
          zoneId: record.zone_id,
          ownerAssignmentId: record.owner_assignment_id,
          ownerLabel: record.owner_label,
          dueAt: record.due_at,
          amount: record.amount,
          currency: record.currency,
          payload: record.payload ?? {},
          version: record.version,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Status could not be updated");
      await load();
      toast.success("Production status updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Status could not be updated");
    } finally {
      setSaving(false);
    }
  };

  const addLink = async (recordId: string) => {
    const draft = linkDrafts[recordId] ?? { title: "", url: "", classification: "INTERNAL" as const };
    setSaving(true);
    try {
      const response = await fetch(`/api/operations/events/${props.eventId}/production/${recordId}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Reference link could not be saved");
      setLinkDrafts((current) => ({ ...current, [recordId]: { title: "", url: "", classification: "INTERNAL" } }));
      await load();
      toast.success("Reference link added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reference link could not be saved");
    } finally {
      setSaving(false);
    }
  };

  const removeLink = async (recordId: string, attachmentId: string) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/operations/events/${props.eventId}/production/${recordId}/attachments/${attachmentId}`, {
        method: "DELETE",
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Reference link could not be removed");
      await load();
      toast.success("Reference link removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reference link could not be removed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="grid animate-pulse gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-32 bg-charcoal/5" />)}</div>;
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          [FolderKanban, "Active records", metrics.active, "Outstanding production work"],
          [AlertTriangle, "Overdue", metrics.overdue, "Past due and unresolved"],
          [CheckCircle2, "Approvals pending", metrics.approvals, "Sign-offs still open"],
          [FileCheck2, "References", metrics.references, "Linked files and sources"],
        ].map(([Icon, label, value, detail]) => {
          const MetricIcon = Icon as typeof FolderKanban;
          return <article key={String(label)} className={dashCard}><MetricIcon className="h-5 w-5 text-camel" /><p className={cn(dashLabel, "mt-4")}>{String(label)}</p><p className="mt-2 font-display text-3xl text-charcoal">{String(value)}</p><p className="mt-1 font-heading text-xs text-slate">{String(detail)}</p></article>;
        })}
      </section>

      {canManage ? (
        <details className={dashCard}>
          <summary className="cursor-pointer list-none">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className={dashLabel}>Shared production register</p><h2 className="mt-2 font-display text-2xl text-charcoal">Add an operational record</h2><p className="mt-2 max-w-3xl font-heading text-sm leading-6 text-slate">Replace a disconnected spreadsheet row with one owned, dated, visible record. Use reference links for Drive files, signed documents, layouts, tickets, or receipts.</p></div>
              <Plus className="h-5 w-5 text-camel" />
            </div>
          </summary>
          <form onSubmit={createRecord} className="mt-6 grid gap-4 border-t border-charcoal/8 pt-5 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2"><span className={dashLabel}>Record type</span><select value={recordType} onChange={(event) => setRecordType(event.target.value as ProductionRecordType)} className="w-full border border-charcoal/15 bg-cream px-3 py-3 font-heading text-sm">{PRODUCTION_RECORD_TYPES.map((value) => <option key={value} value={value}>{productionTypeMeta(value).label}</option>)}</select><span className="block font-heading text-[11px] leading-5 text-slate">{productionTypeMeta(recordType).prompt}</span></label>
            <label className="space-y-2 md:col-span-1 xl:col-span-2"><span className={dashLabel}>Title</span><input required maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Music permissions for the main stage" className="w-full border border-charcoal/15 bg-cream px-3 py-3 font-heading text-sm" /></label>
            <label className="space-y-2"><span className={dashLabel}>Status</span><select value={status} onChange={(event) => setStatus(event.target.value as ProductionStatus)} className="w-full border border-charcoal/15 bg-cream px-3 py-3 font-heading text-sm">{PRODUCTION_STATUSES.map((value) => <option key={value} value={value}>{displayEnum(value)}</option>)}</select></label>
            <label className="space-y-2 md:col-span-2"><span className={dashLabel}>Description</span><textarea rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What is required, what is decided, and what remains open?" className="w-full resize-none border border-charcoal/15 bg-cream px-3 py-3 font-heading text-sm" /></label>
            <label className="space-y-2 md:col-span-2"><span className={dashLabel}>Key details</span><textarea rows={4} value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Quantities, route, room block, authority, audience, handover, or decision notes" className="w-full resize-none border border-charcoal/15 bg-cream px-3 py-3 font-heading text-sm" /></label>
            <label className="space-y-2"><span className={dashLabel}>Function scope</span><select value={functionId} onChange={(event) => setFunctionId(event.target.value)} className="w-full border border-charcoal/15 bg-cream px-3 py-3 font-heading text-sm"><option value="">Whole event</option>{props.functions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
            <label className="space-y-2"><span className={dashLabel}>Department</span><select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} className="w-full border border-charcoal/15 bg-cream px-3 py-3 font-heading text-sm"><option value="">No department</option>{props.departments.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
            <label className="space-y-2"><span className={dashLabel}>Zone</span><select value={zoneId} onChange={(event) => setZoneId(event.target.value)} className="w-full border border-charcoal/15 bg-cream px-3 py-3 font-heading text-sm"><option value="">Event-wide</option>{props.zones.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
            <label className="space-y-2"><span className={dashLabel}>Assigned owner</span><select value={ownerAssignmentId} onChange={(event) => setOwnerAssignmentId(event.target.value)} className="w-full border border-charcoal/15 bg-cream px-3 py-3 font-heading text-sm"><option value="">No assigned crew member</option>{props.team.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.eventRole}</option>)}</select></label>
            <label className="space-y-2"><span className={dashLabel}>External owner / POC</span><input value={ownerLabel} onChange={(event) => setOwnerLabel(event.target.value)} placeholder="Venue or vendor contact" className="w-full border border-charcoal/15 bg-cream px-3 py-3 font-heading text-sm" /></label>
            <label className="space-y-2"><span className={dashLabel}>Due by</span><input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="w-full border border-charcoal/15 bg-cream px-3 py-3 font-heading text-sm" /></label>
            <label className="space-y-2"><span className={dashLabel}>Amount, if applicable</span><input type="number" min="0" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="INR" className="w-full border border-charcoal/15 bg-cream px-3 py-3 font-heading text-sm" /></label>
            <label className="space-y-2"><span className={dashLabel}>Visibility</span><select value={visibility} onChange={(event) => setVisibility(event.target.value as ProductionVisibility)} className="w-full border border-charcoal/15 bg-cream px-3 py-3 font-heading text-sm">{PRODUCTION_VISIBILITIES.filter((value) => value !== "FINANCE" || canViewFinancials).map((value) => <option key={value} value={value}>{displayEnum(value)}</option>)}</select></label>
            <div className="grid gap-3 border border-charcoal/8 bg-cream/50 p-4 md:col-span-2 xl:col-span-4 md:grid-cols-[1fr_1.5fr_12rem]"><label className="space-y-2"><span className={dashLabel}>First reference title</span><input value={attachmentTitle} onChange={(event) => setAttachmentTitle(event.target.value)} placeholder="Signed rider" className="w-full border border-charcoal/15 bg-ivory px-3 py-3 font-heading text-sm" /></label><label className="space-y-2"><span className={dashLabel}>Secure link</span><input type="url" value={attachmentUrl} onChange={(event) => setAttachmentUrl(event.target.value)} placeholder="https://drive.google.com/..." className="w-full border border-charcoal/15 bg-ivory px-3 py-3 font-heading text-sm" /></label><label className="space-y-2"><span className={dashLabel}>Classification</span><select value={attachmentClassification} onChange={(event) => setAttachmentClassification(event.target.value as Attachment["classification"])} className="w-full border border-charcoal/15 bg-ivory px-3 py-3 font-heading text-sm">{CLASSIFICATIONS.filter((value) => value !== "FINANCE" || canViewFinancials).map((value) => <option key={value} value={value}>{displayEnum(value)}</option>)}</select></label></div>
            <button disabled={saving || !title.trim()} className={cn(dashBtn, "md:col-span-2 xl:col-span-4")}>{saving ? "Saving production record..." : "Add to production dossier"}</button>
          </form>
        </details>
      ) : null}

      <section className={cn(dashCard, "space-y-4")}>
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className={dashLabel}>One source of operational truth</p><h2 className="mt-2 font-display text-2xl text-charcoal">Production dossier</h2></div><label className="relative min-w-[16rem] flex-1 md:max-w-sm"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate" /><span className="sr-only">Search production records</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search records, owners, or types" className="w-full border border-charcoal/15 bg-cream py-3 pl-10 pr-3 font-heading text-sm" /></label></div>
        <div className="scrollbar-elysian flex gap-2 overflow-x-auto pb-1">{GROUPS.map((item) => <button key={item.value} type="button" onClick={() => setGroup(item.value)} className={cn("whitespace-nowrap border px-3 py-2 font-accent text-[9px] uppercase tracking-[0.15em]", group === item.value ? "border-saddle-brown bg-saddle-brown text-ivory" : "border-charcoal/12 text-slate hover:border-camel hover:text-charcoal")}>{item.label}<span className="ml-2 opacity-65">{item.value === "all" ? records.length : records.filter((record) => productionTypeMeta(record.record_type).group === item.value).length}</span></button>)}</div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        {filtered.map((record) => {
          const meta = productionTypeMeta(record.record_type);
          const functionName = props.functions.find((item) => item.id === record.wedding_event_id)?.label ?? "Whole event";
          const department = props.departments.find((item) => item.id === record.department_id)?.label;
          const zone = props.zones.find((item) => item.id === record.zone_id)?.label;
          const owner = props.team.find((item) => item.id === record.owner_assignment_id)?.name ?? record.owner_label;
          const overdue = Boolean(record.due_at && new Date(record.due_at).getTime() < now && !["DONE", "CANCELLED"].includes(record.status));
          const notes = typeof record.payload?.notes === "string" ? record.payload.notes : null;
          const draft = linkDrafts[record.id] ?? { title: "", url: "", classification: "INTERNAL" as const };
          return (
            <article key={record.id} className={cn(dashCard, record.status === "CANCELLED" && "opacity-65")}>
              <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex flex-wrap gap-2"><span className={cn(statusBadgeBase, "border-charcoal/12 text-slate")}>{meta.label}</span><span className={statusClass(record.status)}>{displayEnum(record.status)}</span>{overdue ? <span className={cn(statusBadgeBase, "border-saddle-brown bg-saddle-brown/8 text-saddle-brown")}>Overdue</span> : null}</div><span className={dashLabel}>{displayEnum(record.visibility)}</span></div>
              <h3 className="mt-4 font-display text-2xl text-charcoal">{record.title}</h3>
              {record.description ? <p className="mt-2 font-heading text-sm leading-6 text-slate">{record.description}</p> : null}
              {notes ? <p className="mt-3 border-l-2 border-camel pl-3 font-heading text-xs leading-5 text-charcoal">{notes}</p> : null}
              <div className="mt-4 grid gap-3 border-y border-charcoal/8 py-4 sm:grid-cols-2"><div><p className={dashLabel}>Scope</p><p className="mt-1 font-heading text-xs text-charcoal">{functionName}</p>{department || zone ? <p className="mt-1 font-heading text-[11px] text-slate">{[department, zone].filter(Boolean).join(" · ")}</p> : null}</div><div><p className={dashLabel}>Owner and due</p><p className="mt-1 font-heading text-xs text-charcoal">{owner ?? "Owner unassigned"}</p><p className={cn("mt-1 font-heading text-[11px]", overdue ? "text-saddle-brown" : "text-slate")}>{dateLabel(record.due_at)}</p></div>{canViewFinancials && record.amount != null ? <div><p className={dashLabel}>Operational amount</p><p className="mt-1 font-display text-xl text-charcoal">{money(record.amount, record.currency)}</p></div> : null}<div><p className={dashLabel}>Audit</p><p className="mt-1 font-heading text-xs text-charcoal">{record.activity.length} recorded change{record.activity.length === 1 ? "" : "s"}</p><p className="mt-1 font-heading text-[11px] text-slate">Updated {dateLabel(record.updated_at)}</p></div></div>
              {record.attachments.length ? <div className="mt-4 space-y-2"><p className={dashLabel}>Reference links</p>{record.attachments.map((attachment) => <div key={attachment.id} className="flex items-center justify-between gap-3 border border-charcoal/8 bg-cream/45 px-3 py-2"><a href={attachment.url} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2 font-heading text-xs text-charcoal hover:text-saddle-brown"><ExternalLink className="h-3.5 w-3.5 flex-none" /><span className="truncate">{attachment.title}</span><span className="font-accent text-[7px] uppercase tracking-[0.12em] text-slate">{displayEnum(attachment.classification)}</span></a>{canManage ? <button type="button" disabled={saving} onClick={() => void removeLink(record.id, attachment.id)} aria-label={`Remove ${attachment.title}`} className="text-slate hover:text-saddle-brown"><Trash2 className="h-3.5 w-3.5" /></button> : null}</div>)}</div> : null}
              {canManage ? <div className="mt-4 space-y-3"><div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2"><span className={dashLabel}>Status</span><select disabled={saving} value={record.status} onChange={(event) => void updateStatus(record, event.target.value as ProductionStatus)} className="border border-charcoal/15 bg-cream px-3 py-2 font-heading text-xs">{PRODUCTION_STATUSES.map((value) => <option key={value} value={value}>{displayEnum(value)}</option>)}</select></label></div><details className="border border-dashed border-charcoal/15 p-3"><summary className="cursor-pointer list-none font-accent text-[9px] uppercase tracking-[0.15em] text-saddle-brown"><span className="inline-flex items-center gap-2"><Link2 className="h-3.5 w-3.5" /> Add reference link</span></summary><div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1.4fr_10rem_auto]"><input value={draft.title} onChange={(event) => setLinkDrafts((current) => ({ ...current, [record.id]: { ...draft, title: event.target.value } }))} placeholder="Reference title" className="border border-charcoal/15 bg-cream px-3 py-2 font-heading text-xs" /><input type="url" value={draft.url} onChange={(event) => setLinkDrafts((current) => ({ ...current, [record.id]: { ...draft, url: event.target.value } }))} placeholder="https://..." className="border border-charcoal/15 bg-cream px-3 py-2 font-heading text-xs" /><select value={draft.classification} onChange={(event) => setLinkDrafts((current) => ({ ...current, [record.id]: { ...draft, classification: event.target.value as Attachment["classification"] } }))} className="border border-charcoal/15 bg-cream px-3 py-2 font-heading text-xs">{CLASSIFICATIONS.filter((value) => value !== "FINANCE" || canViewFinancials).map((value) => <option key={value} value={value}>{displayEnum(value)}</option>)}</select><button type="button" disabled={saving || !draft.title.trim() || !draft.url.trim()} onClick={() => void addLink(record.id)} className="border border-saddle-brown px-3 py-2 font-accent text-[8px] uppercase tracking-[0.12em] text-saddle-brown disabled:opacity-40">Add</button></div></details></div> : null}
            </article>
          );
        })}
      </div>

      {filtered.length === 0 ? <div className="border border-dashed border-charcoal/15 bg-cream p-10 text-center"><FolderKanban className="mx-auto h-8 w-8 text-camel" /><p className="mt-3 font-display text-2xl text-charcoal">No production records in this view</p><p className="mx-auto mt-2 max-w-xl font-heading text-sm leading-6 text-slate">{records.length ? "Try another domain or clear the search." : "Start with the first contract, recce decision, rooming block, transport route, guest message, or packing handover that the team must control."}</p></div> : null}
    </div>
  );
}
