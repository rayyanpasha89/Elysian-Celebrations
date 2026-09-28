"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileUp,
  LoaderCircle,
  Mail,
  MessageCircleMore,
  Plus,
  Send,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  GUEST_CAMPAIGN_CHANNELS,
  GUEST_CAMPAIGN_TEMPLATES,
  type GuestCampaignAudience,
  type GuestCampaignChannel,
  type GuestCampaignDraft,
  type GuestCampaignStatus,
  type GuestCampaignType,
  type GuestConsentStatus,
  type GuestDeliveryStatus,
} from "@/lib/guest-communications";
import { dashBtn, dashCard, dashLabel, statusBadgeBase } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type Recipient = {
  id: string;
  guestId: string | null;
  recipientName: string;
  channel: string;
  destinationMasked: string | null;
  consentSnapshot: GuestConsentStatus;
  renderedMessage: string;
  deliveryStatus: GuestDeliveryStatus;
  exclusionReason: string | null;
  resultReference: string | null;
  deliveredAt: string | null;
};

type Campaign = {
  id: string;
  weddingEventId: string | null;
  campaignType: GuestCampaignType;
  title: string;
  messageBody: string;
  channel: GuestCampaignChannel;
  audience: GuestCampaignAudience;
  scheduledFor: string | null;
  status: GuestCampaignStatus;
  version: number;
  approvedAt: string | null;
  exportedAt: string | null;
  sentAt: string | null;
  updatedAt: string;
  recipients: Recipient[];
};

type FunctionReference = {
  id: string;
  label: string;
  date: string | null;
  startTime: string | null;
  venue: string | null;
};

type GuestReference = {
  id: string;
  name: string;
  side: string;
  rsvpStatus: string;
  invitationStatus: string;
  vipLevel: string;
  relationshipGroup: string | null;
  hasPhone: boolean;
  hasEmail: boolean;
  whatsappConsent: GuestConsentStatus;
  emailConsent: GuestConsentStatus;
};

type Workspace = {
  campaigns: Campaign[];
  templates: Array<{
    type: GuestCampaignType;
    title: string;
    message: string;
    description: string;
  }>;
  references: {
    event: { id: string; name: string; date: string | null };
    functions: FunctionReference[];
    guests: GuestReference[];
  };
  permissions: { canManage: boolean; automaticDelivery: false };
};

type DeliveryResult = {
  guestId: string;
  status: "SENT" | "DELIVERED" | "FAILED" | "OPTED_OUT";
  reference: string;
};

const emptyAudience = (): GuestCampaignAudience => ({
  sides: [],
  rsvpStatuses: [],
  invitationStatuses: [],
  vipLevels: [],
  relationshipGroups: [],
  guestIds: [],
});

function draftFromTemplate(type: GuestCampaignType = "RSVP"): GuestCampaignDraft {
  const template = GUEST_CAMPAIGN_TEMPLATES[type];
  return {
    campaignId: null,
    version: null,
    campaignType: type,
    title: template.title,
    messageBody: template.message,
    weddingEventId: null,
    channel: "WHATSAPP",
    scheduledFor: null,
    audience: emptyAudience(),
  };
}

function draftFromCampaign(campaign: Campaign): GuestCampaignDraft {
  return {
    campaignId: campaign.id,
    version: campaign.version,
    campaignType: campaign.campaignType,
    title: campaign.title,
    messageBody: campaign.messageBody,
    weddingEventId: campaign.weddingEventId,
    channel: campaign.channel,
    scheduledFor: campaign.scheduledFor,
    audience: campaign.audience,
  };
}

const inputClass =
  "w-full border border-charcoal/14 bg-cream px-3 py-2.5 font-heading text-sm text-charcoal outline-none transition focus:border-saddle-brown disabled:cursor-not-allowed disabled:opacity-55";

function pretty(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

function statusTone(status: string) {
  if (["SENT", "DELIVERED"].includes(status)) return "border-dry-sage-2/70 bg-dry-sage/20 text-dusty-olive";
  if (["EXCLUDED", "FAILED", "OPTED_OUT"].includes(status)) return "border-toffee-brown/55 bg-toffee-brown/8 text-toffee-brown";
  if (["APPROVED", "EXPORTED"].includes(status)) return "border-camel/60 bg-camel/10 text-saddle-brown";
  return "border-charcoal/15 bg-cream text-slate";
}

function localInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function instant(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function FilterChips({
  label,
  values,
  selected,
  onChange,
  disabled,
}: {
  label: string;
  values: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  disabled: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="space-y-2">
      <legend className={dashLabel}>{label}</legend>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onChange(toggleValue(selected, value))}
            className={cn(
              "border px-3 py-2 font-accent text-[9px] uppercase tracking-[0.13em] transition disabled:opacity-55",
              selected.includes(value)
                ? "border-saddle-brown bg-saddle-brown text-ivory"
                : "border-charcoal/12 bg-cream text-slate hover:border-camel",
            )}
          >
            {pretty(value)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') {
      current += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseDeliveryResults(csv: string): DeliveryResult[] {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const header = parseCsvLine(lines[0]).map((value) => value.toLowerCase());
  const guestIndex = header.indexOf("guest_id");
  const statusIndex = header.indexOf("status");
  const referenceIndex = header.indexOf("reference");
  if (guestIndex < 0 || statusIndex < 0) return [];
  return lines.slice(1).flatMap((line) => {
    const cells = parseCsvLine(line);
    const status = cells[statusIndex]?.toUpperCase();
    if (!cells[guestIndex] || !["SENT", "DELIVERED", "FAILED", "OPTED_OUT"].includes(status)) return [];
    return [{
      guestId: cells[guestIndex],
      status: status as DeliveryResult["status"],
      reference: referenceIndex >= 0 ? cells[referenceIndex] ?? "" : "",
    }];
  });
}

export function GuestCommunicationsPanel({ eventId }: { eventId: string }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [draft, setDraft] = useState<GuestCampaignDraft>(() => draftFromTemplate());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [guestQuery, setGuestQuery] = useState("");
  const [deliveryResults, setDeliveryResults] = useState<DeliveryResult[]>([]);

  const endpoint = `/api/operations/events/${eventId}/communications`;
  const load = useCallback(async () => {
    const response = await fetch(endpoint, { cache: "no-store" });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error ?? "Guest communications could not be loaded");
    return json as Workspace;
  }, [endpoint]);

  const refresh = useCallback(async (keepSelection = true) => {
    const next = await load();
    setWorkspace(next);
    if (keepSelection && selectedId) {
      const selected = next.campaigns.find((campaign) => campaign.id === selectedId);
      if (selected) setDraft(draftFromCampaign(selected));
    }
    return next;
  }, [load, selectedId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        const next = await load();
        if (!cancelled) setWorkspace(next);
      } catch (error) {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Guest communications could not be loaded");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [load]);

  const selectedCampaign = useMemo(
    () => workspace?.campaigns.find((campaign) => campaign.id === selectedId) ?? null,
    [selectedId, workspace],
  );
  const canEdit = Boolean(workspace?.permissions.canManage && (!selectedCampaign || selectedCampaign.status === "DRAFT"));
  const visibleGuests = useMemo(() => {
    const query = guestQuery.trim().toLowerCase();
    return (workspace?.references.guests ?? []).filter((guest) =>
      !query || `${guest.name} ${guest.relationshipGroup ?? ""}`.toLowerCase().includes(query),
    );
  }, [guestQuery, workspace]);
  const audienceCount = useMemo(() => {
    if (!workspace) return 0;
    if (draft.audience.guestIds.length) return draft.audience.guestIds.length;
    return workspace.references.guests.filter((guest) =>
      (!draft.audience.sides.length || draft.audience.sides.includes(guest.side)) &&
      (!draft.audience.rsvpStatuses.length || draft.audience.rsvpStatuses.includes(guest.rsvpStatus)) &&
      (!draft.audience.invitationStatuses.length || draft.audience.invitationStatuses.includes(guest.invitationStatus)) &&
      (!draft.audience.vipLevels.length || draft.audience.vipLevels.includes(guest.vipLevel)),
    ).length;
  }, [draft.audience, workspace]);

  const chooseTemplate = (type: GuestCampaignType) => {
    const template = GUEST_CAMPAIGN_TEMPLATES[type];
    setDraft((current) => ({
      ...current,
      campaignType: type,
      title: template.title,
      messageBody: template.message,
    }));
  };

  const createNew = (type: GuestCampaignType = "RSVP") => {
    setSelectedId(null);
    setDraft(draftFromTemplate(type));
    setDeliveryResults([]);
  };

  const selectCampaign = (campaign: Campaign) => {
    setSelectedId(campaign.id);
    setDraft(draftFromCampaign(campaign));
    setDeliveryResults([]);
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      const response = await fetch(endpoint, {
        method: draft.campaignId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Campaign could not be saved");
      const campaign = json.campaign as Campaign;
      setSelectedId(campaign.id);
      const next = await load();
      setWorkspace(next);
      const persisted = next.campaigns.find((item) => item.id === campaign.id) ?? campaign;
      setDraft(draftFromCampaign(persisted));
      toast.success("Campaign draft saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Campaign could not be saved");
    } finally {
      setSaving(false);
    }
  };

  const action = async (
    actionName: "APPROVE" | "EXPORT" | "MARK_SENT",
    results?: DeliveryResult[],
  ) => {
    if (!selectedCampaign) return;
    setSaving(true);
    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionName,
          campaignId: selectedCampaign.id,
          version: selectedCampaign.version,
          ...(results ? { results } : {}),
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Campaign action could not be completed");
      if (actionName === "EXPORT") {
        const exportFile = json.export as { filename: string; csv: string };
        const url = URL.createObjectURL(new Blob([exportFile.csv], { type: "text/csv;charset=utf-8" }));
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = exportFile.filename;
        anchor.click();
        URL.revokeObjectURL(url);
      }
      const next = await load();
      setWorkspace(next);
      const updated = next.campaigns.find((campaign) => campaign.id === selectedCampaign.id);
      if (updated) setDraft(draftFromCampaign(updated));
      setDeliveryResults([]);
      toast.success(
        actionName === "APPROVE" ? "Audience snapshot approved" :
          actionName === "EXPORT" ? "Human-send export downloaded" :
            "Delivery results recorded",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Campaign action could not be completed");
    } finally {
      setSaving(false);
    }
  };

  const updateConsent = async (guest: GuestReference, consentStatus: GuestConsentStatus) => {
    setSaving(true);
    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_CONSENT",
          guestId: guest.id,
          channel: draft.channel,
          consentStatus,
          source: "Operations desk",
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Consent preference could not be updated");
      await refresh(false);
      toast.success("Contact preference updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Consent preference could not be updated");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-72 items-center justify-center border border-charcoal/10 bg-ivory"><LoaderCircle className="h-6 w-6 animate-spin text-camel" /></div>;
  }
  if (!workspace) {
    return <div className={dashCard}><p className="font-heading text-sm text-slate">Guest communications could not be loaded.</p></div>;
  }

  const selectedRecipients = selectedCampaign?.recipients ?? [];
  const eligibleRecipients = selectedRecipients.filter((recipient) => recipient.deliveryStatus !== "EXCLUDED" && recipient.guestId);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden border border-charcoal/10 bg-charcoal-brown text-ivory">
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="font-accent text-[10px] uppercase tracking-[0.2em] text-khaki-beige">Guest communication desk</p>
            <h2 className="mt-2 font-display text-3xl">Approve the audience before a message leaves the room.</h2>
            <p className="mt-3 max-w-3xl font-heading text-sm leading-6 text-dry-sage">Build service messages from the guest list, freeze a consent-aware snapshot, then download a human-send file. Automatic provider delivery stays off.</p>
          </div>
          {workspace.permissions.canManage ? (
            <button type="button" onClick={() => createNew()} className={cn(dashBtn, "border-khaki-beige/40 bg-ivory text-charcoal hover:bg-khaki-beige")}><Plus className="h-4 w-4" /> New campaign</button>
          ) : null}
        </div>
        <div className="grid border-t border-ivory/10 sm:grid-cols-3">
          <div className="p-4"><p className="font-accent text-[9px] uppercase tracking-[0.17em] text-khaki-beige">Campaigns</p><p className="mt-1 font-display text-2xl">{workspace.campaigns.length}</p></div>
          <div className="border-t border-ivory/10 p-4 sm:border-l sm:border-t-0"><p className="font-accent text-[9px] uppercase tracking-[0.17em] text-khaki-beige">Guest records</p><p className="mt-1 font-display text-2xl">{workspace.references.guests.length}</p></div>
          <div className="border-t border-ivory/10 p-4 sm:border-l sm:border-t-0"><p className="font-accent text-[9px] uppercase tracking-[0.17em] text-khaki-beige">Delivery mode</p><p className="mt-1 font-display text-2xl">Human approved</p></div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="space-y-3 self-start xl:sticky xl:top-24">
          <div className={dashCard}>
            <div className="flex items-center justify-between gap-3"><p className={dashLabel}>Campaign register</p><MessageCircleMore className="h-4 w-4 text-camel" /></div>
            <div className="mt-4 space-y-2">
              {workspace.campaigns.map((campaign) => (
                <button key={campaign.id} type="button" onClick={() => selectCampaign(campaign)} className={cn("w-full border p-3 text-left transition", selectedId === campaign.id ? "border-saddle-brown bg-camel/8" : "border-charcoal/10 bg-cream hover:border-camel")}>
                  <div className="flex items-start justify-between gap-2"><span className="font-heading text-sm font-semibold text-charcoal">{campaign.title}</span><span className={cn(statusBadgeBase, statusTone(campaign.status))}>{campaign.status}</span></div>
                  <p className="mt-2 font-heading text-[11px] text-slate">{pretty(campaign.campaignType)} · {campaign.recipients.length} snapshot rows</p>
                </button>
              ))}
              {!workspace.campaigns.length ? <div className="border border-dashed border-charcoal/15 p-5 text-center"><Mail className="mx-auto h-5 w-5 text-camel" /><p className="mt-2 font-heading text-xs leading-5 text-slate">Choose a template and prepare the first approved guest message.</p></div> : null}
            </div>
          </div>
          <div className="border border-dry-sage-2/45 bg-dry-sage/15 p-4"><div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 flex-none text-dusty-olive" /><div><p className={dashLabel}>Safety boundary</p><p className="mt-2 font-heading text-xs leading-5 text-slate">Exports are deliberate handoffs. No WhatsApp, SMS, or email provider is called from this workspace.</p></div></div></div>
        </aside>

        <section className={cn(dashCard, "min-w-0")}>
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-charcoal/8 pb-5">
            <div><p className={dashLabel}>{selectedCampaign ? `${selectedCampaign.status} campaign` : "New campaign"}</p><h3 className="mt-2 font-display text-3xl text-charcoal">{draft.title || "Untitled guest message"}</h3><p className="mt-2 font-heading text-xs text-slate">Estimated audience · {audienceCount} guests</p></div>
            {selectedCampaign ? <span className={cn(statusBadgeBase, statusTone(selectedCampaign.status))}>{selectedCampaign.status}</span> : null}
          </div>

          {(!selectedCampaign || selectedCampaign.status === "DRAFT") ? (
            <div className="mt-5 space-y-6">
              <div><p className={dashLabel}>Start from an operations template</p><div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{workspace.templates.map((template) => <button key={template.type} type="button" disabled={!canEdit} onClick={() => chooseTemplate(template.type)} className={cn("border p-3 text-left transition disabled:opacity-50", draft.campaignType === template.type ? "border-saddle-brown bg-camel/8" : "border-charcoal/10 bg-cream hover:border-camel")}><span className="font-heading text-sm font-semibold text-charcoal">{template.title}</span><span className="mt-1 block font-heading text-[10px] leading-4 text-slate">{template.description}</span></button>)}</div></div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2"><span className={dashLabel}>Title</span><input disabled={!canEdit} value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} maxLength={180} className={inputClass} /></label>
                <label className="space-y-2"><span className={dashLabel}>Function</span><select disabled={!canEdit} value={draft.weddingEventId ?? ""} onChange={(event) => setDraft((current) => ({ ...current, weddingEventId: event.target.value || null }))} className={inputClass}><option value="">Whole event</option>{workspace.references.functions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
                <label className="space-y-2"><span className={dashLabel}>Channel</span><select disabled={!canEdit} value={draft.channel} onChange={(event) => setDraft((current) => ({ ...current, channel: event.target.value as GuestCampaignChannel }))} className={inputClass}>{GUEST_CAMPAIGN_CHANNELS.map((channel) => <option key={channel}>{channel}</option>)}</select></label>
                <label className="space-y-2"><span className={dashLabel}>Schedule for</span><input disabled={!canEdit} type="datetime-local" value={localInput(draft.scheduledFor)} onChange={(event) => setDraft((current) => ({ ...current, scheduledFor: instant(event.target.value) }))} className={inputClass} /></label>
              </div>
              <label className="block space-y-2"><span className={dashLabel}>Message</span><textarea disabled={!canEdit} value={draft.messageBody} onChange={(event) => setDraft((current) => ({ ...current, messageBody: event.target.value }))} rows={5} maxLength={2000} className={cn(inputClass, "resize-y leading-6")} /><span className="block font-heading text-[10px] text-slate">Merge fields: {"{{guest_name}} {{event_name}} {{function_name}} {{venue}} {{date}} {{time}}"}</span></label>

              <div className="border border-charcoal/10 bg-cream/55 p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className={dashLabel}>Audience builder</p><p className="mt-1 font-heading text-xs text-slate">Leave filters empty for every guest, or narrow the segment.</p></div><span className={cn(statusBadgeBase, "border-camel/50 text-saddle-brown")}>{audienceCount} matched</span></div><div className="mt-5 grid gap-5 lg:grid-cols-2"><FilterChips label="Side" values={["BRIDE", "GROOM", "COUPLE", "MUTUAL"]} selected={draft.audience.sides} disabled={!canEdit} onChange={(sides) => setDraft((current) => ({ ...current, audience: { ...current.audience, sides } }))} /><FilterChips label="RSVP" values={["PENDING", "CONFIRMED", "DECLINED", "MAYBE"]} selected={draft.audience.rsvpStatuses} disabled={!canEdit} onChange={(rsvpStatuses) => setDraft((current) => ({ ...current, audience: { ...current.audience, rsvpStatuses } }))} /><FilterChips label="Invitation" values={["NOT_INVITED", "INVITED", "CONFIRMED", "DECLINED", "WAITLIST"]} selected={draft.audience.invitationStatuses} disabled={!canEdit} onChange={(invitationStatuses) => setDraft((current) => ({ ...current, audience: { ...current.audience, invitationStatuses } }))} /><FilterChips label="Guest priority" values={["STANDARD", "VIP", "VVIP"]} selected={draft.audience.vipLevels} disabled={!canEdit} onChange={(vipLevels) => setDraft((current) => ({ ...current, audience: { ...current.audience, vipLevels } }))} /></div></div>

              <div><div className="flex flex-wrap items-end justify-between gap-3"><div><p className={dashLabel}>Specific guests and consent</p><p className="mt-1 font-heading text-xs text-slate">Selecting guests overrides broad audience matching. Opted-out contacts are always excluded.</p></div><input value={guestQuery} onChange={(event) => setGuestQuery(event.target.value)} placeholder="Search guest" className={cn(inputClass, "max-w-xs")} /></div><div className="mt-3 max-h-72 overflow-y-auto border border-charcoal/10">{visibleGuests.map((guest) => { const consent = draft.channel === "WHATSAPP" ? guest.whatsappConsent : guest.emailConsent; const selected = draft.audience.guestIds.includes(guest.id); return <div key={guest.id} className="grid gap-3 border-b border-charcoal/8 p-3 last:border-b-0 sm:grid-cols-[1fr_auto_auto] sm:items-center"><label className="flex min-w-0 items-center gap-3"><input disabled={!canEdit} type="checkbox" checked={selected} onChange={() => setDraft((current) => ({ ...current, audience: { ...current.audience, guestIds: toggleValue(current.audience.guestIds, guest.id) } }))} /><span className="min-w-0"><span className="block truncate font-heading text-sm text-charcoal">{guest.name}</span><span className="block font-heading text-[10px] text-slate">{pretty(guest.rsvpStatus)} · {pretty(guest.vipLevel)} · {guest.relationshipGroup ?? "Group pending"}</span></span></label><span className={cn(statusBadgeBase, statusTone(consent === "OPTED_OUT" ? "OPTED_OUT" : "DRAFT"))}>{pretty(consent)}</span>{workspace.permissions.canManage ? <select disabled={saving} value={consent} onChange={(event) => void updateConsent(guest, event.target.value as GuestConsentStatus)} className="border border-charcoal/12 bg-cream px-2 py-1.5 font-heading text-xs"><option value="UNKNOWN">Unknown</option><option value="OPTED_IN">Opted in</option><option value="OPTED_OUT">Opted out</option></select> : null}</div>; })}{!visibleGuests.length ? <p className="p-5 text-center font-heading text-xs text-slate">No guests match this search.</p> : null}</div></div>

              {workspace.permissions.canManage ? <div className="sticky bottom-3 z-10 flex justify-end border border-charcoal/10 bg-ivory/95 p-3 shadow-[0_14px_44px_rgba(51,61,41,0.14)] backdrop-blur"><button type="button" disabled={saving || !draft.title.trim() || !draft.messageBody.trim()} onClick={() => void saveDraft()} className={dashBtn}>{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} {saving ? "Saving..." : "Save draft"}</button></div> : null}
            </div>
          ) : (
            <div className="mt-5 space-y-5"><div className="grid gap-3 sm:grid-cols-3"><div className="border border-charcoal/10 bg-cream p-4"><p className={dashLabel}>Eligible</p><p className="mt-2 font-display text-2xl text-charcoal">{eligibleRecipients.length}</p></div><div className="border border-charcoal/10 bg-cream p-4"><p className={dashLabel}>Excluded</p><p className="mt-2 font-display text-2xl text-charcoal">{selectedRecipients.filter((item) => item.deliveryStatus === "EXCLUDED").length}</p></div><div className="border border-charcoal/10 bg-cream p-4"><p className={dashLabel}>Delivered</p><p className="mt-2 font-display text-2xl text-charcoal">{selectedRecipients.filter((item) => item.deliveryStatus === "DELIVERED").length}</p></div></div><div className="max-h-[34rem] overflow-y-auto border border-charcoal/10">{selectedRecipients.map((recipient) => <article key={recipient.id} className="border-b border-charcoal/8 p-4 last:border-b-0"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-heading text-sm font-semibold text-charcoal">{recipient.recipientName}</p><p className="mt-1 font-heading text-[10px] text-slate">{recipient.destinationMasked ?? recipient.exclusionReason ?? "No destination"}</p></div><span className={cn(statusBadgeBase, statusTone(recipient.deliveryStatus))}>{pretty(recipient.deliveryStatus)}</span></div><p className="mt-3 border-l-2 border-camel/45 pl-3 font-heading text-xs leading-5 text-slate">{recipient.renderedMessage}</p></article>)}</div></div>
          )}

          {selectedCampaign && workspace.permissions.canManage ? <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-charcoal/8 pt-5"><p className="font-heading text-xs text-slate">Status order: Draft → Approved → Exported → Sent. Earlier snapshots cannot be edited.</p><div className="flex flex-wrap gap-2">{selectedCampaign.status === "DRAFT" ? <button disabled={saving} type="button" onClick={() => void action("APPROVE")} className={dashBtn}><ShieldCheck className="h-4 w-4" /> Approve audience</button> : null}{selectedCampaign.status === "APPROVED" ? <button disabled={saving} type="button" onClick={() => void action("EXPORT")} className={dashBtn}><Download className="h-4 w-4" /> Export for human send</button> : null}{selectedCampaign.status === "EXPORTED" ? <><label className={cn(dashBtn, "cursor-pointer bg-cream text-charcoal")}><FileUp className="h-4 w-4" /> Import results<input type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; void file.text().then((contents) => { const parsed = parseDeliveryResults(contents); setDeliveryResults(parsed); toast[parsed.length ? "success" : "error"](parsed.length ? `${parsed.length} delivery results ready` : "Use columns guest_id, status, reference"); }); }} /></label><button disabled={saving || (!deliveryResults.length && !eligibleRecipients.length)} type="button" onClick={() => void action("MARK_SENT", deliveryResults.length ? deliveryResults : eligibleRecipients.map((recipient) => ({ guestId: recipient.guestId!, status: "SENT", reference: "Human-send confirmation" })))} className={dashBtn}><Send className="h-4 w-4" /> {deliveryResults.length ? `Record ${deliveryResults.length} results` : "Mark human send complete"}</button></> : null}</div></div> : null}
        </section>
      </div>
    </div>
  );
}
