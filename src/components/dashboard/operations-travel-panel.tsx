"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BedDouble,
  BusFront,
  CheckCircle2,
  ChevronRight,
  CirclePlus,
  LoaderCircle,
  Plane,
  Search,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import {
  PARTNER_PARTY_TYPES,
  PARTNER_STAY_STATUSES,
  PARTNER_TRANSFER_STATUSES,
  PARTNER_TRAVEL_MODES,
  PARTNER_TRAVEL_STATUSES,
  partnerTravelIsArrived,
  partnerTravelNeedsAttention,
  type PartnerPartyType,
  type PartnerStayStatus,
  type PartnerTransferStatus,
  type PartnerTravelDraft,
  type PartnerTravelMode,
  type PartnerTravelStatus,
} from "@/lib/partner-travel";
import { dashBtn, dashCard, dashLabel, statusBadgeBase } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type TravelParty = PartnerTravelDraft & { updatedAt: string };
type BookingReference = {
  id: string;
  vendorProfileId: string;
  weddingEventId: string | null;
  status: string;
  label: string;
  vendorName: string;
  serviceName: string;
};
type FunctionReference = {
  id: string;
  label: string;
  date: string | null;
  timeBlock: string | null;
};
type TravelWorkspace = {
  parties: TravelParty[];
  references: {
    functions: FunctionReference[];
    bookings: BookingReference[];
  };
  permissions: {
    canManage: boolean;
    canViewFinancials: boolean;
  };
};

type EditorStep = "overview" | "journeys" | "stay" | "pickups";
type ManifestFilter = "all" | "attention" | "arrived";

const STEPS: { value: EditorStep; label: string; icon: typeof Plane }[] = [
  { value: "overview", label: "Overview", icon: UsersRound },
  { value: "journeys", label: "Journeys", icon: Plane },
  { value: "stay", label: "Stay", icon: BedDouble },
  { value: "pickups", label: "Pickups", icon: BusFront },
];

const inputClass =
  "w-full border border-charcoal/14 bg-cream px-3 py-2.5 font-heading text-sm text-charcoal outline-none transition focus:border-saddle-brown disabled:cursor-not-allowed disabled:opacity-55";

function label(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

function localInput(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function instant(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function dateLabel(value: string | null) {
  if (!value) return "Date pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function createDraft(type: PartnerPartyType = "VENDOR"): TravelParty {
  return {
    partyId: null,
    version: null,
    party: {
      bookingId: null,
      vendorProfileId: null,
      weddingEventId: null,
      partyType: type,
      name: "",
      company: "",
      departmentLabel: type === "ARTIST" || type === "PERFORMER" ? "Entertainment" : "",
      roleLabel: "",
      headCount: 1,
      contactLabel: "",
      foodPlan: "",
      perDiemAmount: null,
      ownerLabel: "",
      notes: "",
    },
    travelLegs: [],
    stays: [],
    transfers: [],
    updatedAt: "",
  };
}

function statusTone(party: TravelParty) {
  if (partnerTravelIsArrived(party)) return "border-dry-sage-2/70 bg-dry-sage/20 text-dusty-olive";
  if (partnerTravelNeedsAttention(party)) return "border-toffee-brown/50 bg-toffee-brown/8 text-toffee-brown";
  return "border-camel/50 bg-camel/8 text-saddle-brown";
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className={dashLabel}>{children}</span>;
}

export function OperationsTravelPanel({ eventId }: { eventId: string }) {
  const [workspace, setWorkspace] = useState<TravelWorkspace | null>(null);
  const [draft, setDraft] = useState<TravelParty | null>(null);
  const [step, setStep] = useState<EditorStep>("overview");
  const [filter, setFilter] = useState<ManifestFilter>("all");
  const [query, setQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [functionFilter, setFunctionFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/operations/events/${eventId}/travel`, {
      cache: "no-store",
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error ?? "Partner travel could not be loaded");
    return json as TravelWorkspace;
  }, [eventId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        const next = await load();
        if (!cancelled) setWorkspace(next);
      } catch (error) {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Partner travel could not be loaded");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const parties = useMemo(() => workspace?.parties ?? [], [workspace?.parties]);
  const departments = useMemo(
    () => [...new Set(parties.map((item) => item.party.departmentLabel).filter(Boolean))].sort(),
    [parties],
  );
  const visibleParties = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return parties.filter((item) => {
      if (filter === "attention" && !partnerTravelNeedsAttention(item)) return false;
      if (filter === "arrived" && !partnerTravelIsArrived(item)) return false;
      if (departmentFilter && item.party.departmentLabel !== departmentFilter) return false;
      if (functionFilter && item.party.weddingEventId !== functionFilter) return false;
      if (!needle) return true;
      return [item.party.name, item.party.company, item.party.departmentLabel, item.party.roleLabel]
        .some((value) => value.toLowerCase().includes(needle));
    });
  }, [departmentFilter, filter, functionFilter, parties, query]);

  const metrics = useMemo(
    () => ({
      people: parties.reduce((sum, item) => sum + item.party.headCount, 0),
      arrived: parties.filter(partnerTravelIsArrived).reduce((sum, item) => sum + item.party.headCount, 0),
      attention: parties.filter(partnerTravelNeedsAttention).length,
      rooms: parties.flatMap((item) => item.stays).reduce((sum, item) => sum + item.roomCount, 0),
      pickups: parties.flatMap((item) => item.transfers).filter((item) => !["DROPPED", "CANCELLED"].includes(item.status)).length,
    }),
    [parties],
  );

  const canManage = workspace?.permissions.canManage ?? false;
  const canViewFinancials = workspace?.permissions.canViewFinancials ?? false;

  const startDraft = (type: PartnerPartyType) => {
    setDraft(createDraft(type));
    setStep("overview");
  };

  const selectParty = (party: TravelParty) => {
    setDraft(structuredClone(party));
    setStep("overview");
  };

  const patchParty = (values: Partial<TravelParty["party"]>) => {
    setDraft((current) => current ? { ...current, party: { ...current.party, ...values } } : current);
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/operations/events/${eventId}/travel`, {
        method: draft.partyId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Partner travel could not be saved");
      const saved = json.party as TravelParty;
      setWorkspace((current) => current ? {
        ...current,
        parties: current.parties.some((item) => item.partyId === saved.partyId)
          ? current.parties.map((item) => item.partyId === saved.partyId ? saved : item)
          : [...current.parties, saved],
      } : current);
      setDraft(structuredClone(saved));
      toast.success(draft.partyId ? "Travel manifest updated" : "Travel party added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Partner travel could not be saved");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="grid animate-pulse gap-5 sm:grid-cols-[15rem_minmax(0,1fr)]"><div className="h-[34rem] bg-charcoal/5" /><div className="h-[34rem] bg-charcoal/5" /></div>;
  }
  if (!workspace) {
    return <div className={cn(dashCard, "text-center")}><AlertTriangle className="mx-auto h-8 w-8 text-saddle-brown" /><h2 className="mt-3 font-display text-2xl text-charcoal">Travel desk unavailable</h2><p className="mt-2 font-heading text-sm text-slate">Reload the event room before editing movement or rooming details.</p></div>;
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden border border-charcoal/10 bg-charcoal-brown text-ivory">
        <div className="grid gap-px bg-ivory/10 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["Travelers", metrics.people],
            ["Arrived", metrics.arrived],
            ["Needs attention", metrics.attention],
            ["Rooms held", metrics.rooms],
            ["Open pickups", metrics.pickups],
          ].map(([name, value]) => (
            <div key={name} className="bg-charcoal-brown px-5 py-4">
              <p className="font-display text-3xl">{value}</p>
              <p className="mt-1 font-accent text-[9px] uppercase tracking-[0.2em] text-khaki-beige/70">{name}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-5 sm:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className={cn(dashCard, "self-start p-0")}>
          <div className="border-b border-charcoal/8 p-5">
            <p className={dashLabel}>Movement manifest</p>
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search team or company" className={cn(inputClass, "pl-9")} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1 border border-charcoal/10 p-1">
              {(["all", "attention", "arrived"] as ManifestFilter[]).map((value) => (
                <button key={value} type="button" onClick={() => setFilter(value)} className={cn("px-2 py-2 font-accent text-[8px] uppercase tracking-[0.14em]", filter === value ? "bg-charcoal-brown text-ivory" : "text-slate hover:bg-charcoal/5")}>{label(value)}</button>
              ))}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-1">
              <select aria-label="Filter partner travel by department" value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className={inputClass}>
                <option value="">All departments</option>
                {departments.map((item) => <option key={item}>{item}</option>)}
              </select>
              <select aria-label="Filter partner travel by function" value={functionFilter} onChange={(event) => setFunctionFilter(event.target.value)} className={inputClass}>
                <option value="">All functions</option>
                {workspace.references.functions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </div>
          </div>
          {canManage ? (
            <div className="grid grid-cols-3 gap-px border-b border-charcoal/8 bg-charcoal/8">
              {(["VENDOR", "ARTIST", "CREW"] as PartnerPartyType[]).map((type) => (
                <button key={type} type="button" onClick={() => startDraft(type)} className="bg-ivory px-2 py-3 font-accent text-[8px] uppercase tracking-[0.14em] text-saddle-brown hover:bg-khaki-beige/25">+ {label(type)}</button>
              ))}
            </div>
          ) : null}
          <div className="max-h-[34rem] overflow-y-auto">
            {visibleParties.map((item) => (
              <button key={item.partyId} type="button" onClick={() => selectParty(item)} className={cn("block w-full border-b border-charcoal/8 px-5 py-4 text-left transition hover:bg-khaki-beige/14", draft?.partyId === item.partyId && "bg-khaki-beige/20")}>
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-display text-xl text-charcoal">{item.party.name}</p><p className="mt-1 font-heading text-xs text-slate">{item.party.company || label(item.party.partyType)} · {item.party.headCount} people</p></div>
                  <ChevronRight className="mt-1 h-4 w-4 flex-none text-camel" />
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className={cn(statusBadgeBase, statusTone(item))}>{partnerTravelIsArrived(item) ? "Arrived" : partnerTravelNeedsAttention(item) ? "Needs attention" : "In transit"}</span>
                  <span className="font-accent text-[8px] uppercase tracking-[0.14em] text-slate">{item.party.departmentLabel || "Unassigned"}</span>
                </div>
              </button>
            ))}
            {visibleParties.length === 0 ? <div className="p-8 text-center"><Plane className="mx-auto h-7 w-7 text-camel" /><p className="mt-3 font-display text-xl text-charcoal">No manifest rows here</p><p className="mt-2 font-heading text-xs leading-5 text-slate">Add a vendor, artist, or crew party, or clear the current filters.</p></div> : null}
          </div>
        </aside>

        <section className={cn(dashCard, "min-w-0 p-0")}>
          {!draft ? (
            <div className="flex min-h-[32rem] flex-col items-center justify-center px-6 py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-camel/45 bg-khaki-beige/15"><Plane className="h-7 w-7 text-saddle-brown" /></div>
              <p className="mt-5 font-accent text-[9px] uppercase tracking-[0.22em] text-saddle-brown">Travel desk</p>
              <h2 className="mt-2 max-w-lg font-display text-3xl text-charcoal">Choose one party to coordinate their whole movement</h2>
              <p className="mt-3 max-w-xl font-heading text-sm leading-6 text-slate">Journeys, rooms, food plans, per-diems, and pickups stay together. Start from a selected partner booking whenever one exists.</p>
            </div>
          ) : (
            <>
              <header className="border-b border-charcoal/8 px-5 py-5 md:px-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div><p className={dashLabel}>{draft.partyId ? "Manifest record" : "New travel party"}</p><h2 className="mt-2 font-display text-3xl text-charcoal">{draft.party.name || `${label(draft.party.partyType)} travel`}</h2><p className="mt-2 font-heading text-xs text-slate">{draft.party.headCount} people · {draft.travelLegs.length} journeys · {draft.stays.reduce((sum, item) => sum + item.roomCount, 0)} rooms</p></div>
                  <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-dusty-olive" /><p className="max-w-xs font-heading text-[11px] leading-5 text-slate">Passport, Aadhaar, PAN, and full PNR values are never stored in this workspace.</p></div>
                </div>
                <select aria-label="Travel editor step" value={step} onChange={(event) => setStep(event.target.value as EditorStep)} className={cn(inputClass, "mt-5 md:hidden")}>
                  {STEPS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
                <nav className="mt-5 hidden grid-cols-4 gap-px bg-charcoal/8 md:grid" aria-label="Travel editor steps">
                  {STEPS.map((item) => { const Icon = item.icon; return <button key={item.value} type="button" onClick={() => setStep(item.value)} className={cn("flex items-center justify-center gap-2 bg-ivory px-3 py-3 font-accent text-[9px] uppercase tracking-[0.16em]", step === item.value ? "bg-charcoal-brown text-ivory" : "text-slate hover:bg-khaki-beige/16")}><Icon className="h-4 w-4" />{item.label}</button>; })}
                </nav>
              </header>

              <fieldset disabled={!canManage || saving} className="px-5 py-6 md:px-7">
                {step === "overview" ? (
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2"><FieldLabel>Party type</FieldLabel><select value={draft.party.partyType} onChange={(event) => patchParty({ partyType: event.target.value as PartnerPartyType })} className={inputClass}>{PARTNER_PARTY_TYPES.map((item) => <option key={item}>{item}</option>)}</select></label>
                      <label className="space-y-2"><FieldLabel>Selected partner booking</FieldLabel><select value={draft.party.bookingId ?? ""} onChange={(event) => { const booking = workspace.references.bookings.find((item) => item.id === event.target.value); patchParty({ bookingId: booking?.id ?? null, vendorProfileId: booking?.vendorProfileId ?? null, weddingEventId: booking?.weddingEventId ?? draft.party.weddingEventId, company: booking?.vendorName ?? draft.party.company, name: draft.party.name || booking?.vendorName || "" }); }} className={inputClass}><option value="">No linked booking · internal crew or speaker</option>{workspace.references.bookings.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
                      <label className="space-y-2"><FieldLabel>Party or team name</FieldLabel><input required value={draft.party.name} onChange={(event) => patchParty({ name: event.target.value })} maxLength={180} className={inputClass} /></label>
                      <label className="space-y-2"><FieldLabel>Company</FieldLabel><input value={draft.party.company} onChange={(event) => patchParty({ company: event.target.value })} maxLength={180} className={inputClass} /></label>
                      <label className="space-y-2"><FieldLabel>Function</FieldLabel><select value={draft.party.weddingEventId ?? ""} onChange={(event) => patchParty({ weddingEventId: event.target.value || null })} className={inputClass}><option value="">Whole event</option>{workspace.references.functions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
                      <label className="space-y-2"><FieldLabel>Head count</FieldLabel><input type="number" min={1} max={500} value={draft.party.headCount} onChange={(event) => patchParty({ headCount: Number(event.target.value) })} className={inputClass} /></label>
                      <label className="space-y-2"><FieldLabel>Department</FieldLabel><input value={draft.party.departmentLabel} onChange={(event) => patchParty({ departmentLabel: event.target.value })} maxLength={120} placeholder="Entertainment, AV, catering..." className={inputClass} /></label>
                      <label className="space-y-2"><FieldLabel>Role</FieldLabel><input value={draft.party.roleLabel} onChange={(event) => patchParty({ roleLabel: event.target.value })} maxLength={120} placeholder="Headline act, setup crew..." className={inputClass} /></label>
                      <label className="space-y-2"><FieldLabel>Safe contact label</FieldLabel><input value={draft.party.contactLabel} onChange={(event) => patchParty({ contactLabel: event.target.value })} maxLength={180} placeholder="Tour manager · phone held in secure contacts" className={inputClass} /></label>
                      <label className="space-y-2"><FieldLabel>Internal owner</FieldLabel><input value={draft.party.ownerLabel} onChange={(event) => patchParty({ ownerLabel: event.target.value })} maxLength={160} placeholder="Artist liaison" className={inputClass} /></label>
                      <label className="space-y-2 md:col-span-2"><FieldLabel>Food and hospitality plan</FieldLabel><textarea value={draft.party.foodPlan} onChange={(event) => patchParty({ foodPlan: event.target.value })} maxLength={500} rows={3} className={inputClass} /></label>
                      {canViewFinancials ? <label className="space-y-2"><FieldLabel>Total per-diem allocation</FieldLabel><input type="number" min={0} value={draft.party.perDiemAmount ?? ""} onChange={(event) => patchParty({ perDiemAmount: event.target.value === "" ? null : Number(event.target.value) })} className={inputClass} /></label> : null}
                      <label className={cn("space-y-2", !canViewFinancials && "md:col-span-2")}><FieldLabel>Operating notes</FieldLabel><textarea value={draft.party.notes} onChange={(event) => patchParty({ notes: event.target.value })} maxLength={1500} rows={3} className={inputClass} /></label>
                    </div>
                  </div>
                ) : null}

                {step === "journeys" ? <div className="space-y-4"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className={dashLabel}>Arrival and departure legs</p><p className="mt-2 font-heading text-sm text-slate">Use a safe booking label, never a full PNR or identity number.</p></div>{canManage ? <button type="button" onClick={() => setDraft((current) => current ? { ...current, travelLegs: [...current.travelLegs, { id: null, mode: "FLIGHT", provider: "", referenceLabel: "", origin: "", destination: "", departureAt: "", arrivalAt: "", status: "PLANNED", pickupRequired: false }] } : current)} className={dashBtn}><CirclePlus className="h-4 w-4" /> Add journey</button> : null}</div>{draft.travelLegs.map((item, index) => <div key={item.id ?? `leg-${index}`} className="border border-charcoal/10 bg-cream/35 p-4"><div className="mb-4 flex items-center justify-between"><p className={dashLabel}>Journey {index + 1}</p><button type="button" onClick={() => setDraft((current) => current ? { ...current, travelLegs: current.travelLegs.filter((_, itemIndex) => itemIndex !== index), transfers: current.transfers.map((transfer) => ({ ...transfer, travelLegIndex: transfer.travelLegIndex === index ? null : transfer.travelLegIndex !== null && transfer.travelLegIndex > index ? transfer.travelLegIndex - 1 : transfer.travelLegIndex })) } : current)} className="font-accent text-[8px] uppercase tracking-[0.16em] text-saddle-brown">Remove</button></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><label className="space-y-2"><FieldLabel>Mode</FieldLabel><select value={item.mode} onChange={(event) => setDraft((current) => current ? { ...current, travelLegs: current.travelLegs.map((leg, itemIndex) => itemIndex === index ? { ...leg, mode: event.target.value as PartnerTravelMode } : leg) } : current)} className={inputClass}>{PARTNER_TRAVEL_MODES.map((value) => <option key={value}>{value}</option>)}</select></label><label className="space-y-2"><FieldLabel>Provider</FieldLabel><input value={item.provider} onChange={(event) => setDraft((current) => current ? { ...current, travelLegs: current.travelLegs.map((leg, itemIndex) => itemIndex === index ? { ...leg, provider: event.target.value } : leg) } : current)} className={inputClass} /></label><label className="space-y-2"><FieldLabel>Safe reference</FieldLabel><input value={item.referenceLabel} onChange={(event) => setDraft((current) => current ? { ...current, travelLegs: current.travelLegs.map((leg, itemIndex) => itemIndex === index ? { ...leg, referenceLabel: event.target.value } : leg) } : current)} placeholder="Eight confirmed seats" className={inputClass} /></label><label className="space-y-2"><FieldLabel>Origin</FieldLabel><input value={item.origin} onChange={(event) => setDraft((current) => current ? { ...current, travelLegs: current.travelLegs.map((leg, itemIndex) => itemIndex === index ? { ...leg, origin: event.target.value } : leg) } : current)} className={inputClass} /></label><label className="space-y-2"><FieldLabel>Destination</FieldLabel><input value={item.destination} onChange={(event) => setDraft((current) => current ? { ...current, travelLegs: current.travelLegs.map((leg, itemIndex) => itemIndex === index ? { ...leg, destination: event.target.value } : leg) } : current)} className={inputClass} /></label><label className="space-y-2"><FieldLabel>Status</FieldLabel><select value={item.status} onChange={(event) => setDraft((current) => current ? { ...current, travelLegs: current.travelLegs.map((leg, itemIndex) => itemIndex === index ? { ...leg, status: event.target.value as PartnerTravelStatus } : leg) } : current)} className={inputClass}>{PARTNER_TRAVEL_STATUSES.map((value) => <option key={value}>{value}</option>)}</select></label><label className="space-y-2"><FieldLabel>Departure</FieldLabel><input type="datetime-local" value={localInput(item.departureAt)} onChange={(event) => setDraft((current) => current ? { ...current, travelLegs: current.travelLegs.map((leg, itemIndex) => itemIndex === index ? { ...leg, departureAt: instant(event.target.value) } : leg) } : current)} className={inputClass} /></label><label className="space-y-2"><FieldLabel>Arrival</FieldLabel><input type="datetime-local" value={localInput(item.arrivalAt)} onChange={(event) => setDraft((current) => current ? { ...current, travelLegs: current.travelLegs.map((leg, itemIndex) => itemIndex === index ? { ...leg, arrivalAt: instant(event.target.value) } : leg) } : current)} className={inputClass} /></label><label className="flex items-center gap-3 border border-charcoal/10 px-3 py-2.5 font-heading text-sm text-charcoal"><input type="checkbox" checked={item.pickupRequired} onChange={(event) => setDraft((current) => current ? { ...current, travelLegs: current.travelLegs.map((leg, itemIndex) => itemIndex === index ? { ...leg, pickupRequired: event.target.checked } : leg) } : current)} className="h-4 w-4 accent-saddle-brown" /> Pickup required</label></div></div>)}{draft.travelLegs.length === 0 ? <div className="border border-dashed border-charcoal/15 p-8 text-center"><Plane className="mx-auto h-7 w-7 text-camel" /><p className="mt-3 font-display text-xl text-charcoal">No journey recorded</p><p className="mt-2 font-heading text-xs text-slate">Add each inbound and outbound leg so arrivals and departures remain visible.</p></div> : null}</div> : null}

                {step === "stay" ? <div className="space-y-4"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className={dashLabel}>Accommodation and meals</p><p className="mt-2 font-heading text-sm text-slate">Track room blocks and meal coverage without storing private identity documents.</p></div>{canManage ? <button type="button" onClick={() => setDraft((current) => current ? { ...current, stays: [...current.stays, { id: null, hotelName: "", roomType: "", roomCount: 1, checkInDate: "", checkOutDate: "", status: "PLANNED", foodPlan: "" }] } : current)} className={dashBtn}><CirclePlus className="h-4 w-4" /> Add stay</button> : null}</div>{draft.stays.map((item, index) => <div key={item.id ?? `stay-${index}`} className="border border-charcoal/10 bg-cream/35 p-4"><div className="mb-4 flex items-center justify-between"><p className={dashLabel}>Stay {index + 1}</p><button type="button" onClick={() => setDraft((current) => current ? { ...current, stays: current.stays.filter((_, itemIndex) => itemIndex !== index) } : current)} className="font-accent text-[8px] uppercase tracking-[0.16em] text-saddle-brown">Remove</button></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><label className="space-y-2"><FieldLabel>Hotel</FieldLabel><input value={item.hotelName} onChange={(event) => setDraft((current) => current ? { ...current, stays: current.stays.map((stay, itemIndex) => itemIndex === index ? { ...stay, hotelName: event.target.value } : stay) } : current)} className={inputClass} /></label><label className="space-y-2"><FieldLabel>Room type</FieldLabel><input value={item.roomType} onChange={(event) => setDraft((current) => current ? { ...current, stays: current.stays.map((stay, itemIndex) => itemIndex === index ? { ...stay, roomType: event.target.value } : stay) } : current)} className={inputClass} /></label><label className="space-y-2"><FieldLabel>Rooms</FieldLabel><input type="number" min={1} max={250} value={item.roomCount} onChange={(event) => setDraft((current) => current ? { ...current, stays: current.stays.map((stay, itemIndex) => itemIndex === index ? { ...stay, roomCount: Number(event.target.value) } : stay) } : current)} className={inputClass} /></label><label className="space-y-2"><FieldLabel>Check-in</FieldLabel><input type="date" value={item.checkInDate} onChange={(event) => setDraft((current) => current ? { ...current, stays: current.stays.map((stay, itemIndex) => itemIndex === index ? { ...stay, checkInDate: event.target.value } : stay) } : current)} className={inputClass} /></label><label className="space-y-2"><FieldLabel>Check-out</FieldLabel><input type="date" value={item.checkOutDate} onChange={(event) => setDraft((current) => current ? { ...current, stays: current.stays.map((stay, itemIndex) => itemIndex === index ? { ...stay, checkOutDate: event.target.value } : stay) } : current)} className={inputClass} /></label><label className="space-y-2"><FieldLabel>Status</FieldLabel><select value={item.status} onChange={(event) => setDraft((current) => current ? { ...current, stays: current.stays.map((stay, itemIndex) => itemIndex === index ? { ...stay, status: event.target.value as PartnerStayStatus } : stay) } : current)} className={inputClass}>{PARTNER_STAY_STATUSES.map((value) => <option key={value}>{value}</option>)}</select></label><label className="space-y-2 md:col-span-2 xl:col-span-3"><FieldLabel>Food plan</FieldLabel><textarea value={item.foodPlan} onChange={(event) => setDraft((current) => current ? { ...current, stays: current.stays.map((stay, itemIndex) => itemIndex === index ? { ...stay, foodPlan: event.target.value } : stay) } : current)} rows={2} className={inputClass} /></label></div></div>)}{draft.stays.length === 0 ? <div className="border border-dashed border-charcoal/15 p-8 text-center"><BedDouble className="mx-auto h-7 w-7 text-camel" /><p className="mt-3 font-display text-xl text-charcoal">No stay required yet</p><p className="mt-2 font-heading text-xs text-slate">Add accommodation only when this party needs a room block.</p></div> : null}</div> : null}

                {step === "pickups" ? <div className="space-y-4"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className={dashLabel}>Pickup and drop movements</p><p className="mt-2 font-heading text-sm text-slate">Link a pickup to its journey so the arrival desk can spot missing vehicles.</p></div>{canManage ? <button type="button" onClick={() => setDraft((current) => current ? { ...current, transfers: [...current.transfers, { id: null, travelLegIndex: current.travelLegs.length ? 0 : null, routeLabel: "", pickupAt: "", pickupLocation: "", dropLocation: "", vehicleLabel: "", status: "PLANNED" }] } : current)} className={dashBtn}><CirclePlus className="h-4 w-4" /> Add pickup</button> : null}</div>{draft.transfers.map((item, index) => <div key={item.id ?? `transfer-${index}`} className="border border-charcoal/10 bg-cream/35 p-4"><div className="mb-4 flex items-center justify-between"><p className={dashLabel}>Movement {index + 1}</p><button type="button" onClick={() => setDraft((current) => current ? { ...current, transfers: current.transfers.filter((_, itemIndex) => itemIndex !== index) } : current)} className="font-accent text-[8px] uppercase tracking-[0.16em] text-saddle-brown">Remove</button></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><label className="space-y-2"><FieldLabel>Linked journey</FieldLabel><select value={item.travelLegIndex ?? ""} onChange={(event) => setDraft((current) => current ? { ...current, transfers: current.transfers.map((transfer, itemIndex) => itemIndex === index ? { ...transfer, travelLegIndex: event.target.value === "" ? null : Number(event.target.value) } : transfer) } : current)} className={inputClass}><option value="">Standalone movement</option>{draft.travelLegs.map((leg, legIndex) => <option key={leg.id ?? legIndex} value={legIndex}>{leg.origin || "Origin"} → {leg.destination || "Destination"} · {dateLabel(leg.arrivalAt)}</option>)}</select></label><label className="space-y-2"><FieldLabel>Route</FieldLabel><input value={item.routeLabel} onChange={(event) => setDraft((current) => current ? { ...current, transfers: current.transfers.map((transfer, itemIndex) => itemIndex === index ? { ...transfer, routeLabel: event.target.value } : transfer) } : current)} className={inputClass} /></label><label className="space-y-2"><FieldLabel>Status</FieldLabel><select value={item.status} onChange={(event) => setDraft((current) => current ? { ...current, transfers: current.transfers.map((transfer, itemIndex) => itemIndex === index ? { ...transfer, status: event.target.value as PartnerTransferStatus } : transfer) } : current)} className={inputClass}>{PARTNER_TRANSFER_STATUSES.map((value) => <option key={value}>{value}</option>)}</select></label><label className="space-y-2"><FieldLabel>Pickup time</FieldLabel><input type="datetime-local" value={localInput(item.pickupAt)} onChange={(event) => setDraft((current) => current ? { ...current, transfers: current.transfers.map((transfer, itemIndex) => itemIndex === index ? { ...transfer, pickupAt: instant(event.target.value) } : transfer) } : current)} className={inputClass} /></label><label className="space-y-2"><FieldLabel>Pickup location</FieldLabel><input value={item.pickupLocation} onChange={(event) => setDraft((current) => current ? { ...current, transfers: current.transfers.map((transfer, itemIndex) => itemIndex === index ? { ...transfer, pickupLocation: event.target.value } : transfer) } : current)} className={inputClass} /></label><label className="space-y-2"><FieldLabel>Drop location</FieldLabel><input value={item.dropLocation} onChange={(event) => setDraft((current) => current ? { ...current, transfers: current.transfers.map((transfer, itemIndex) => itemIndex === index ? { ...transfer, dropLocation: event.target.value } : transfer) } : current)} className={inputClass} /></label><label className="space-y-2 md:col-span-2 xl:col-span-3"><FieldLabel>Vehicle or driver label</FieldLabel><input value={item.vehicleLabel} onChange={(event) => setDraft((current) => current ? { ...current, transfers: current.transfers.map((transfer, itemIndex) => itemIndex === index ? { ...transfer, vehicleLabel: event.target.value } : transfer) } : current)} placeholder="Tempo 01 · driver held in secure contacts" className={inputClass} /></label></div></div>)}{draft.transfers.length === 0 ? <div className="border border-dashed border-charcoal/15 p-8 text-center"><BusFront className="mx-auto h-7 w-7 text-camel" /><p className="mt-3 font-display text-xl text-charcoal">No pickup assigned</p><p className="mt-2 font-heading text-xs text-slate">Add airport, station, hotel, venue, and departure movements here.</p></div> : null}</div> : null}
              </fieldset>

              <footer className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-charcoal/10 bg-ivory/95 px-5 py-4 backdrop-blur md:px-7">
                <div className="flex items-center gap-2 font-heading text-xs text-slate">{partnerTravelNeedsAttention(draft) ? <AlertTriangle className="h-4 w-4 text-toffee-brown" /> : <CheckCircle2 className="h-4 w-4 text-dusty-olive" />}{partnerTravelNeedsAttention(draft) ? "Complete the highlighted movement gaps before arrival." : "Movement plan is operationally complete."}</div>
                {canManage ? <button type="button" onClick={save} disabled={saving} className={cn(dashBtn, "min-w-44 justify-center")}>{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}{saving ? "Saving..." : draft.partyId ? "Save manifest" : "Add to manifest"}</button> : <span className={cn(statusBadgeBase, "border-charcoal/12 text-slate")}>Read only</span>}
              </footer>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
