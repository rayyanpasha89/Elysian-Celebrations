"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeftRight,
  BedDouble,
  BellRing,
  LoaderCircle,
  PlaneTakeoff,
  Plus,
  Save,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import {
  GUEST_HOSPITALITY_STATUSES,
  GUEST_HOSPITALITY_TYPES,
  GUEST_INVITATION_STATUSES,
  GUEST_KEY_STATUSES,
  GUEST_LUGGAGE_STATUSES,
  GUEST_STAY_STATUSES,
  GUEST_TRANSFER_STATUSES,
  GUEST_TRAVEL_MODES,
  GUEST_TRAVEL_STATUSES,
  GUEST_VIP_LEVELS,
  type GuestHospitalityStatus,
  type GuestHospitalityType,
  type GuestInvitationStatus,
  type GuestKeyStatus,
  type GuestLuggageStatus,
  type GuestStayStatus,
  type GuestTransferStatus,
  type GuestTravelMode,
  type GuestTravelStatus,
  type GuestVipLevel,
} from "@/lib/guest-operations";
import { cn } from "@/lib/utils";

type GuestSummary = { id: string; name: string };

type GuestOperationsDraft = {
  version: number | null;
  profile: {
    householdName: string;
    relationshipGroup: string;
    invitationStatus: GuestInvitationStatus;
    vipLevel: GuestVipLevel;
    accessibilityNotes: string;
    ownerLabel: string;
  };
  travelLegs: Array<{
    id: string | null;
    mode: GuestTravelMode;
    provider: string;
    referenceLabel: string;
    origin: string;
    destination: string;
    departureAt: string;
    arrivalAt: string;
    status: GuestTravelStatus;
    pickupRequired: boolean;
    notes: string;
  }>;
  stays: Array<{
    id: string | null;
    hotelName: string;
    roomType: string;
    roomNumber: string;
    checkInDate: string;
    checkOutDate: string;
    status: GuestStayStatus;
    keyStatus: GuestKeyStatus;
    luggageStatus: GuestLuggageStatus;
    notes: string;
  }>;
  transfers: Array<{
    id: string | null;
    travelLegIndex: number | null;
    vehicleLabel: string;
    routeLabel: string;
    pickupAt: string;
    pickupLocation: string;
    dropLocation: string;
    seatLabel: string;
    status: GuestTransferStatus;
    notes: string;
  }>;
  hospitalityItems: Array<{
    id: string | null;
    type: GuestHospitalityType;
    title: string;
    status: GuestHospitalityStatus;
    ownerLabel: string;
    dueAt: string;
    notes: string;
  }>;
};

type SnapshotResponse = {
  id: string | null;
  version: number | null;
  profile?: Partial<GuestOperationsDraft["profile"]>;
  travelLegs?: Array<GuestOperationsDraft["travelLegs"][number]>;
  stays?: Array<GuestOperationsDraft["stays"][number]>;
  transfers?: Array<
    Omit<GuestOperationsDraft["transfers"][number], "travelLegIndex"> & {
      travelLegId?: string | null;
    }
  >;
  hospitalityItems?: Array<GuestOperationsDraft["hospitalityItems"][number]>;
};

const STEPS = [
  { key: "profile", label: "Profile", icon: UserRound },
  { key: "travel", label: "Travel", icon: PlaneTakeoff },
  { key: "stay", label: "Stay", icon: BedDouble },
  { key: "transfers", label: "Transfers", icon: ArrowLeftRight },
  { key: "care", label: "Care", icon: BellRing },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

const EMPTY_DRAFT: GuestOperationsDraft = {
  version: null,
  profile: {
    householdName: "",
    relationshipGroup: "",
    invitationStatus: "NOT_INVITED",
    vipLevel: "STANDARD",
    accessibilityNotes: "",
    ownerLabel: "",
  },
  travelLegs: [],
  stays: [],
  transfers: [],
  hospitalityItems: [],
};

const labelFor = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

function localDateTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function isoDateTime(value: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function shiftedDate(value: string, days: number) {
  const date = value ? new Date(`${value}T00:00:00`) : new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function draftFromSnapshot(snapshot: SnapshotResponse): GuestOperationsDraft {
  const travelLegs = (snapshot.travelLegs ?? []).map((leg) => ({
    ...leg,
    id: leg.id ?? null,
    provider: leg.provider ?? "",
    referenceLabel: leg.referenceLabel ?? "",
    departureAt: localDateTime(leg.departureAt),
    arrivalAt: localDateTime(leg.arrivalAt),
    notes: leg.notes ?? "",
  }));
  return {
    version: snapshot.version ?? null,
    profile: {
      ...EMPTY_DRAFT.profile,
      ...snapshot.profile,
      householdName: snapshot.profile?.householdName ?? "",
      relationshipGroup: snapshot.profile?.relationshipGroup ?? "",
      accessibilityNotes: snapshot.profile?.accessibilityNotes ?? "",
      ownerLabel: snapshot.profile?.ownerLabel ?? "",
    },
    travelLegs,
    stays: (snapshot.stays ?? []).map((stay) => ({
      ...stay,
      id: stay.id ?? null,
      roomType: stay.roomType ?? "",
      roomNumber: stay.roomNumber ?? "",
      notes: stay.notes ?? "",
    })),
    transfers: (snapshot.transfers ?? []).map((transfer) => ({
      ...transfer,
      id: transfer.id ?? null,
      travelLegIndex: transfer.travelLegId
        ? travelLegs.findIndex((leg) => leg.id === transfer.travelLegId)
        : null,
      vehicleLabel: transfer.vehicleLabel ?? "",
      pickupAt: localDateTime(transfer.pickupAt),
      seatLabel: transfer.seatLabel ?? "",
      notes: transfer.notes ?? "",
    })),
    hospitalityItems: (snapshot.hospitalityItems ?? []).map((item) => ({
      ...item,
      id: item.id ?? null,
      ownerLabel: item.ownerLabel ?? "",
      dueAt: localDateTime(item.dueAt),
      notes: item.notes ?? "",
    })),
  };
}

export function GuestOperationsPanel({
  guest,
  weddingId,
  eventName,
  eventDate,
}: {
  guest: GuestSummary;
  weddingId: string;
  eventName: string;
  eventDate: string;
}) {
  const [step, setStep] = useState<StepKey>("profile");
  const [draft, setDraft] = useState<GuestOperationsDraft>(EMPTY_DRAFT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setDirty(false);
      try {
        const response = await fetch(
          `/api/guests/${guest.id}/travel?weddingId=${encodeURIComponent(weddingId)}`
        );
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Could not load guest operations");
        if (!cancelled) setDraft(draftFromSnapshot(payload.snapshot as SnapshotResponse));
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Could not load guest operations");
          setDraft(EMPTY_DRAFT);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [guest.id, weddingId]);

  const update = (recipe: (current: GuestOperationsDraft) => GuestOperationsDraft) => {
    setDraft(recipe);
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/guests/${guest.id}/travel`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weddingId,
          version: draft.version,
          profile: draft.profile,
          travelLegs: draft.travelLegs.map((leg) => ({
            ...leg,
            departureAt: isoDateTime(leg.departureAt),
            arrivalAt: isoDateTime(leg.arrivalAt),
          })),
          stays: draft.stays,
          transfers: draft.transfers.map((transfer) => ({
            ...transfer,
            pickupAt: isoDateTime(transfer.pickupAt),
          })),
          hospitalityItems: draft.hospitalityItems.map((item) => ({
            ...item,
            dueAt: item.dueAt ? isoDateTime(item.dueAt) : null,
          })),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not save guest operations");
      setDraft(draftFromSnapshot(payload.snapshot as SnapshotResponse));
      setDirty(false);
      toast.success(`${guest.name}'s operations saved`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save guest operations");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-72 place-items-center border border-charcoal/10 bg-ivory">
        <div className="text-center">
          <LoaderCircle className="mx-auto h-5 w-5 animate-spin text-gold-dark" />
          <p className="mt-3 font-accent text-[10px] uppercase tracking-[0.18em] text-slate">
            Loading guest operations
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="border border-charcoal/10 bg-ivory">
      <header className="border-b border-charcoal/10 p-5 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="[overflow-wrap:anywhere] font-accent text-[10px] uppercase tracking-[0.22em] text-gold-dark">
              Guest operations · {eventName}
            </p>
            <h2 className="mt-2 font-display text-2xl text-charcoal">{guest.name}</h2>
            <p className="mt-1 break-words text-sm text-slate">
              Travel, room, transfers, keys, luggage, and personal care in one record.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.14em] text-slate">
            <span className="border border-charcoal/10 px-2.5 py-1.5">
              {draft.travelLegs.length} legs
            </span>
            <span className="border border-charcoal/10 px-2.5 py-1.5">
              {draft.stays.length} stays
            </span>
            <span className="border border-charcoal/10 px-2.5 py-1.5">
              {draft.hospitalityItems.filter((item) => item.status !== "DONE").length} open care
            </span>
          </div>
        </div>
      </header>

      <label className="block border-b border-charcoal/10 p-4 sm:hidden">
        <span className="mb-2 block font-accent text-[10px] uppercase tracking-[0.18em] text-slate">
          Current step
        </span>
        <select
          value={step}
          onChange={(event) => setStep(event.target.value as StepKey)}
          className={inputClass}
          aria-label="Guest operations step"
        >
          {STEPS.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      <nav className="scrollbar-elysian hidden overflow-x-auto border-b border-charcoal/10 p-2 sm:flex" aria-label="Guest operations steps">
        {STEPS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setStep(item.key)}
              aria-current={step === item.key ? "step" : undefined}
              className={cn(
                "inline-flex min-w-fit items-center gap-2 px-4 py-2.5 font-accent text-[10px] uppercase tracking-[0.16em] transition-colors",
                step === item.key
                  ? "bg-charcoal text-ivory"
                  : "text-slate hover:bg-cream hover:text-charcoal"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-5 md:p-6">
        {step === "profile" ? <ProfileStep draft={draft} update={update} /> : null}
        {step === "travel" ? (
          <TravelStep draft={draft} eventDate={eventDate} update={update} />
        ) : null}
        {step === "stay" ? (
          <StayStep draft={draft} eventDate={eventDate} update={update} />
        ) : null}
        {step === "transfers" ? (
          <TransferStep draft={draft} eventDate={eventDate} update={update} />
        ) : null}
        {step === "care" ? (
          <CareStep draft={draft} eventDate={eventDate} update={update} />
        ) : null}
      </div>

      <footer className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-charcoal/10 bg-ivory/95 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate">
          {dirty ? "Unsaved changes across this guest record." : "Everything shown is saved."}
        </p>
        <button
          type="button"
          onClick={() => void save()}
          disabled={!dirty || saving}
          className={cn(
            "inline-flex min-h-11 items-center justify-center gap-2 border px-5 font-accent text-[10px] uppercase tracking-[0.18em] transition-colors",
            dirty && !saving
              ? "border-gold-primary bg-gold-primary text-midnight hover:bg-gold-dark"
              : "border-charcoal/10 bg-charcoal/5 text-slate/50"
          )}
        >
          {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving" : "Save guest operations"}
        </button>
      </footer>
    </section>
  );
}

type UpdateDraft = (recipe: (current: GuestOperationsDraft) => GuestOperationsDraft) => void;

function ProfileStep({ draft, update }: { draft: GuestOperationsDraft; update: UpdateDraft }) {
  return (
    <StepFrame
      title="Who this guest is"
      description="Set the household, relationship, priority, and care owner once. The field team can then act without reading private notes in a spreadsheet."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <InputField label="Household or party">
          <input
            value={draft.profile.householdName}
            onChange={(event) =>
              update((current) => ({
                ...current,
                profile: { ...current.profile, householdName: event.target.value },
              }))
            }
            placeholder="Example: Mehta family"
            className={inputClass}
          />
        </InputField>
        <InputField label="Relationship group">
          <input
            value={draft.profile.relationshipGroup}
            onChange={(event) =>
              update((current) => ({
                ...current,
                profile: { ...current.profile, relationshipGroup: event.target.value },
              }))
            }
            placeholder="Immediate family, college friends…"
            className={inputClass}
          />
        </InputField>
        <InputField label="Invitation state">
          <select
            value={draft.profile.invitationStatus}
            onChange={(event) =>
              update((current) => ({
                ...current,
                profile: {
                  ...current.profile,
                  invitationStatus: event.target.value as GuestInvitationStatus,
                },
              }))
            }
            className={inputClass}
          >
            {GUEST_INVITATION_STATUSES.map((status) => (
              <option key={status} value={status}>{labelFor(status)}</option>
            ))}
          </select>
        </InputField>
        <InputField label="Guest priority">
          <select
            value={draft.profile.vipLevel}
            onChange={(event) =>
              update((current) => ({
                ...current,
                profile: { ...current.profile, vipLevel: event.target.value as GuestVipLevel },
              }))
            }
            className={inputClass}
          >
            {GUEST_VIP_LEVELS.map((level) => (
              <option key={level} value={level}>{labelFor(level)}</option>
            ))}
          </select>
        </InputField>
        <InputField label="Hospitality owner">
          <input
            value={draft.profile.ownerLabel}
            onChange={(event) =>
              update((current) => ({
                ...current,
                profile: { ...current.profile, ownerLabel: event.target.value },
              }))
            }
            placeholder="Named desk lead or team"
            className={inputClass}
          />
        </InputField>
        <InputField label="Accessibility and handling" className="md:col-span-2">
          <textarea
            value={draft.profile.accessibilityNotes}
            onChange={(event) =>
              update((current) => ({
                ...current,
                profile: { ...current.profile, accessibilityNotes: event.target.value },
              }))
            }
            placeholder="Mobility, medical, language, child, senior, or other assistance the team must prepare."
            rows={3}
            className={inputClass}
          />
        </InputField>
      </div>
    </StepFrame>
  );
}

function TravelStep({ draft, eventDate, update }: { draft: GuestOperationsDraft; eventDate: string; update: UpdateDraft }) {
  const add = () => {
    const departure = `${eventDate || shiftedDate("", 0)}T09:00`;
    const arrival = `${eventDate || shiftedDate("", 0)}T11:00`;
    update((current) => ({
      ...current,
      travelLegs: [...current.travelLegs, {
        id: null,
        mode: "FLIGHT",
        provider: "",
        referenceLabel: "",
        origin: "",
        destination: "",
        departureAt: departure,
        arrivalAt: arrival,
        status: "PLANNED",
        pickupRequired: true,
        notes: "",
      }],
    }));
  };
  return (
    <StepFrame title="Arrival and departure" description="Track options and confirmed journeys. Store only a safe booking label here; identity documents and full PNRs belong in restricted storage.">
      <CollectionHeader label={`${draft.travelLegs.length} travel legs`} action="Add travel leg" onAdd={add} />
      {draft.travelLegs.length === 0 ? <EmptyLine copy="No travel is mapped yet. Add the first arrival or departure." /> : null}
      <div className="space-y-4">
        {draft.travelLegs.map((leg, index) => (
          <ItemCard key={leg.id ?? index} index={index} title={leg.origin && leg.destination ? `${leg.origin} to ${leg.destination}` : "New travel leg"} onRemove={() => update((current) => ({ ...current, travelLegs: current.travelLegs.filter((_, itemIndex) => itemIndex !== index), transfers: current.transfers.map((transfer) => ({ ...transfer, travelLegIndex: transfer.travelLegIndex === index ? null : transfer.travelLegIndex != null && transfer.travelLegIndex > index ? transfer.travelLegIndex - 1 : transfer.travelLegIndex })) }))}>
            <div className="grid gap-3 md:grid-cols-3">
              <SelectField label="Mode" value={leg.mode} values={GUEST_TRAVEL_MODES} onChange={(value) => update((current) => ({ ...current, travelLegs: current.travelLegs.map((item, itemIndex) => itemIndex === index ? { ...item, mode: value as GuestTravelMode } : item) }))} />
              <TextField label="From" value={leg.origin} onChange={(value) => updateTravel(update, index, { origin: value })} />
              <TextField label="To" value={leg.destination} onChange={(value) => updateTravel(update, index, { destination: value })} />
              <TextField label="Provider" value={leg.provider} onChange={(value) => updateTravel(update, index, { provider: value })} />
              <TextField label="Safe booking label" value={leg.referenceLabel} onChange={(value) => updateTravel(update, index, { referenceLabel: value })} placeholder="Confirmed, held, agent reference" />
              <SelectField label="Status" value={leg.status} values={GUEST_TRAVEL_STATUSES} onChange={(value) => updateTravel(update, index, { status: value as GuestTravelStatus })} />
              <DateTimeField label="Departure" value={leg.departureAt} onChange={(value) => updateTravel(update, index, { departureAt: value })} />
              <DateTimeField label="Arrival" value={leg.arrivalAt} onChange={(value) => updateTravel(update, index, { arrivalAt: value })} />
              <InputField label="Pickup">
                <button type="button" onClick={() => updateTravel(update, index, { pickupRequired: !leg.pickupRequired })} className={cn("min-h-11 w-full border px-3 text-left text-sm", leg.pickupRequired ? "border-gold-primary bg-gold-primary/10 text-gold-dark" : "border-charcoal/15 text-slate")}>{leg.pickupRequired ? "Pickup required" : "No pickup needed"}</button>
              </InputField>
              <TextAreaField label="Travel notes" value={leg.notes} onChange={(value) => updateTravel(update, index, { notes: value })} className="md:col-span-3" />
            </div>
          </ItemCard>
        ))}
      </div>
    </StepFrame>
  );
}

function StayStep({ draft, eventDate, update }: { draft: GuestOperationsDraft; eventDate: string; update: UpdateDraft }) {
  const add = () => update((current) => ({ ...current, stays: [...current.stays, { id: null, hotelName: "", roomType: "", roomNumber: "", checkInDate: eventDate || shiftedDate("", 0), checkOutDate: shiftedDate(eventDate, 1), status: "PLANNED", keyStatus: "PENDING", luggageStatus: "EXPECTED", notes: "" }] }));
  return (
    <StepFrame title="Hotel and rooming" description="One stay card carries room allocation, key handover, luggage state, and the exception notes the hospitality desk needs.">
      <CollectionHeader label={`${draft.stays.length} hotel stays`} action="Add stay" onAdd={add} />
      {draft.stays.length === 0 ? <EmptyLine copy="No room is mapped yet. Add a hotel stay when accommodation is needed." /> : null}
      <div className="space-y-4">
        {draft.stays.map((stay, index) => (
          <ItemCard key={stay.id ?? index} index={index} title={stay.hotelName || "New hotel stay"} onRemove={() => update((current) => ({ ...current, stays: current.stays.filter((_, itemIndex) => itemIndex !== index) }))}>
            <div className="grid gap-3 md:grid-cols-3">
              <TextField label="Hotel" value={stay.hotelName} onChange={(value) => updateStay(update, index, { hotelName: value })} />
              <TextField label="Room type" value={stay.roomType} onChange={(value) => updateStay(update, index, { roomType: value })} />
              <TextField label="Room / allocation" value={stay.roomNumber} onChange={(value) => updateStay(update, index, { roomNumber: value })} />
              <DateField label="Check-in" value={stay.checkInDate} onChange={(value) => updateStay(update, index, { checkInDate: value })} />
              <DateField label="Checkout" value={stay.checkOutDate} onChange={(value) => updateStay(update, index, { checkOutDate: value })} />
              <SelectField label="Stay status" value={stay.status} values={GUEST_STAY_STATUSES} onChange={(value) => updateStay(update, index, { status: value as GuestStayStatus })} />
              <SelectField label="Key status" value={stay.keyStatus} values={GUEST_KEY_STATUSES} onChange={(value) => updateStay(update, index, { keyStatus: value as GuestKeyStatus })} />
              <SelectField label="Luggage status" value={stay.luggageStatus} values={GUEST_LUGGAGE_STATUSES} onChange={(value) => updateStay(update, index, { luggageStatus: value as GuestLuggageStatus })} />
              <TextAreaField label="Rooming notes" value={stay.notes} onChange={(value) => updateStay(update, index, { notes: value })} className="md:col-span-3" />
            </div>
          </ItemCard>
        ))}
      </div>
    </StepFrame>
  );
}

function TransferStep({ draft, eventDate, update }: { draft: GuestOperationsDraft; eventDate: string; update: UpdateDraft }) {
  const add = () => update((current) => ({ ...current, transfers: [...current.transfers, { id: null, travelLegIndex: current.travelLegs.length > 0 ? 0 : null, vehicleLabel: "", routeLabel: "", pickupAt: `${eventDate || shiftedDate("", 0)}T12:00`, pickupLocation: "", dropLocation: "", seatLabel: "", status: "PLANNED", notes: "" }] }));
  return (
    <StepFrame title="Ground transfers" description="Assign the route, vehicle, pickup time, and live transfer state without duplicating the travel itinerary.">
      <CollectionHeader label={`${draft.transfers.length} transfers`} action="Add transfer" onAdd={add} />
      {draft.transfers.length === 0 ? <EmptyLine copy="No transfers are mapped. Add airport, station, hotel, or venue movement." /> : null}
      <div className="space-y-4">
        {draft.transfers.map((transfer, index) => (
          <ItemCard key={transfer.id ?? index} index={index} title={transfer.routeLabel || "New transfer"} onRemove={() => update((current) => ({ ...current, transfers: current.transfers.filter((_, itemIndex) => itemIndex !== index) }))}>
            <div className="grid gap-3 md:grid-cols-3">
              <InputField label="Linked travel leg">
                <select value={transfer.travelLegIndex ?? ""} onChange={(event) => updateTransfer(update, index, { travelLegIndex: event.target.value === "" ? null : Number(event.target.value) })} className={inputClass}>
                  <option value="">No linked leg</option>
                  {draft.travelLegs.map((leg, legIndex) => <option key={leg.id ?? legIndex} value={legIndex}>{leg.origin || "Origin"} to {leg.destination || "destination"}</option>)}
                </select>
              </InputField>
              <TextField label="Route" value={transfer.routeLabel} onChange={(value) => updateTransfer(update, index, { routeLabel: value })} />
              <TextField label="Vehicle" value={transfer.vehicleLabel} onChange={(value) => updateTransfer(update, index, { vehicleLabel: value })} />
              <DateTimeField label="Pickup time" value={transfer.pickupAt} onChange={(value) => updateTransfer(update, index, { pickupAt: value })} />
              <TextField label="Pickup point" value={transfer.pickupLocation} onChange={(value) => updateTransfer(update, index, { pickupLocation: value })} />
              <TextField label="Drop point" value={transfer.dropLocation} onChange={(value) => updateTransfer(update, index, { dropLocation: value })} />
              <TextField label="Seat / group" value={transfer.seatLabel} onChange={(value) => updateTransfer(update, index, { seatLabel: value })} />
              <SelectField label="Transfer status" value={transfer.status} values={GUEST_TRANSFER_STATUSES} onChange={(value) => updateTransfer(update, index, { status: value as GuestTransferStatus })} />
              <TextAreaField label="Transfer notes" value={transfer.notes} onChange={(value) => updateTransfer(update, index, { notes: value })} className="md:col-span-3" />
            </div>
          </ItemCard>
        ))}
      </div>
    </StepFrame>
  );
}

function CareStep({ draft, eventDate, update }: { draft: GuestOperationsDraft; eventDate: string; update: UpdateDraft }) {
  const add = () => update((current) => ({ ...current, hospitalityItems: [...current.hospitalityItems, { id: null, type: "WELCOME", title: "", status: "PLANNED", ownerLabel: current.profile.ownerLabel, dueAt: `${eventDate || shiftedDate("", 0)}T14:00`, notes: "" }] }));
  return (
    <StepFrame title="Hospitality and personal care" description="Turn welcome, hamper, salon, accessibility, and service-recovery needs into owned actions instead of free-text reminders.">
      <CollectionHeader label={`${draft.hospitalityItems.length} care actions`} action="Add care action" onAdd={add} />
      {draft.hospitalityItems.length === 0 ? <EmptyLine copy="No personal care actions are open for this guest." /> : null}
      <div className="space-y-4">
        {draft.hospitalityItems.map((item, index) => (
          <ItemCard key={item.id ?? index} index={index} title={item.title || "New care action"} onRemove={() => update((current) => ({ ...current, hospitalityItems: current.hospitalityItems.filter((_, itemIndex) => itemIndex !== index) }))}>
            <div className="grid gap-3 md:grid-cols-3">
              <SelectField label="Type" value={item.type} values={GUEST_HOSPITALITY_TYPES} onChange={(value) => updateCare(update, index, { type: value as GuestHospitalityType })} />
              <TextField label="Action" value={item.title} onChange={(value) => updateCare(update, index, { title: value })} />
              <SelectField label="Status" value={item.status} values={GUEST_HOSPITALITY_STATUSES} onChange={(value) => updateCare(update, index, { status: value as GuestHospitalityStatus })} />
              <TextField label="Owner" value={item.ownerLabel} onChange={(value) => updateCare(update, index, { ownerLabel: value })} />
              <DateTimeField label="Due" value={item.dueAt} onChange={(value) => updateCare(update, index, { dueAt: value })} />
              <TextAreaField label="Care notes" value={item.notes} onChange={(value) => updateCare(update, index, { notes: value })} className="md:col-span-3" />
            </div>
          </ItemCard>
        ))}
      </div>
    </StepFrame>
  );
}

const inputClass = "min-h-11 w-full border border-charcoal/15 bg-cream/20 px-3 py-2 font-heading text-sm text-charcoal outline-none transition-colors focus:border-gold-primary focus:ring-2 focus:ring-gold-primary/15";

function StepFrame({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <div><div className="mb-5 max-w-2xl"><h3 className="font-display text-xl text-charcoal">{title}</h3><p className="mt-1 text-sm leading-relaxed text-slate">{description}</p></div>{children}</div>;
}

function CollectionHeader({ label, action, onAdd }: { label: string; action: string; onAdd: () => void }) {
  return <div className="mb-4 flex items-center justify-between gap-3 border-y border-charcoal/8 py-3"><p className="font-accent text-[10px] uppercase tracking-[0.18em] text-slate">{label}</p><button type="button" onClick={onAdd} className="inline-flex items-center gap-2 border border-gold-primary/40 px-3 py-2 font-accent text-[10px] uppercase tracking-[0.14em] text-gold-dark hover:bg-gold-primary/10"><Plus className="h-3.5 w-3.5" />{action}</button></div>;
}

function ItemCard({ index, title, onRemove, children }: { index: number; title: string; onRemove: () => void; children: React.ReactNode }) {
  return <article className="border border-charcoal/10 bg-cream/20"><div className="flex items-center justify-between gap-3 border-b border-charcoal/8 px-4 py-3"><div><p className="font-accent text-[9px] uppercase tracking-[0.18em] text-gold-dark">Record {String(index + 1).padStart(2, "0")}</p><h4 className="mt-1 font-heading text-sm text-charcoal">{title}</h4></div><button type="button" onClick={onRemove} aria-label={`Remove ${title}`} className="grid h-9 w-9 place-items-center border border-charcoal/10 text-slate hover:border-rose/40 hover:text-rose"><Trash2 className="h-4 w-4" /></button></div><div className="p-4">{children}</div></article>;
}

function InputField({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return <label className={cn("block", className)}><span className="mb-1.5 block font-accent text-[9px] uppercase tracking-[0.16em] text-slate">{label}</span>{children}</label>;
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <InputField label={label}><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={inputClass} /></InputField>;
}

function TextAreaField({ label, value, onChange, className }: { label: string; value: string; onChange: (value: string) => void; className?: string }) {
  return <InputField label={label} className={className}><textarea value={value} onChange={(event) => onChange(event.target.value)} rows={2} className={inputClass} /></InputField>;
}

function SelectField({ label, value, values, onChange }: { label: string; value: string; values: readonly string[]; onChange: (value: string) => void }) {
  return <InputField label={label}><select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>{values.map((item) => <option key={item} value={item}>{labelFor(item)}</option>)}</select></InputField>;
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <InputField label={label}><input type="date" value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} /></InputField>;
}

function DateTimeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <InputField label={label}><input type="datetime-local" value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} /></InputField>;
}

function EmptyLine({ copy }: { copy: string }) {
  return <div className="mb-4 border border-dashed border-charcoal/15 bg-cream/20 p-5 text-sm text-slate">{copy}</div>;
}

function updateTravel(update: UpdateDraft, index: number, patch: Partial<GuestOperationsDraft["travelLegs"][number]>) {
  update((current) => ({ ...current, travelLegs: current.travelLegs.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) }));
}
function updateStay(update: UpdateDraft, index: number, patch: Partial<GuestOperationsDraft["stays"][number]>) {
  update((current) => ({ ...current, stays: current.stays.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) }));
}
function updateTransfer(update: UpdateDraft, index: number, patch: Partial<GuestOperationsDraft["transfers"][number]>) {
  update((current) => ({ ...current, transfers: current.transfers.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) }));
}
function updateCare(update: UpdateDraft, index: number, patch: Partial<GuestOperationsDraft["hospitalityItems"][number]>) {
  update((current) => ({ ...current, hospitalityItems: current.hospitalityItems.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) }));
}
