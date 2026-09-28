-- Consent-aware, approval-gated guest communications. Elysian prepares
-- immutable exports for human delivery; no provider send is performed here.

create table public.event_guest_communication_campaigns (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  wedding_event_id uuid references public.wedding_events(id) on delete set null,
  campaign_type text not null,
  title text not null,
  message_body text not null,
  channel text not null,
  audience_definition jsonb not null default '{}'::jsonb,
  scheduled_for timestamptz,
  status text not null default 'DRAFT',
  version integer not null default 1,
  approved_by text,
  approved_at timestamptz,
  exported_by text,
  exported_at timestamptz,
  sent_by text,
  sent_at timestamptz,
  created_by text not null,
  updated_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_guest_campaign_id_event_unique unique (id, wedding_id),
  constraint event_guest_campaign_type_valid check (
    campaign_type in (
      'RSVP','ARRIVAL','ROOM_KEYS','FUNCTION_INVITATION',
      'BREAKFAST','DEPARTURE','EMERGENCY','THANK_YOU'
    )
  ),
  constraint event_guest_campaign_title_valid check (
    btrim(title) <> '' and char_length(title) <= 180
  ),
  constraint event_guest_campaign_message_valid check (
    btrim(message_body) <> '' and char_length(message_body) <= 2000
  ),
  constraint event_guest_campaign_channel_valid check (channel in ('WHATSAPP','EMAIL')),
  constraint event_guest_campaign_audience_valid check (jsonb_typeof(audience_definition) = 'object'),
  constraint event_guest_campaign_status_valid check (
    status in ('DRAFT','APPROVED','EXPORTED','SENT')
  ),
  constraint event_guest_campaign_version_valid check (version >= 1)
);

create table public.event_guest_contact_preferences (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  channel text not null,
  consent_status text not null default 'UNKNOWN',
  source text,
  updated_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_guest_contact_preference_unique unique (wedding_id, guest_id, channel),
  constraint event_guest_contact_preference_channel_valid check (channel in ('WHATSAPP','EMAIL')),
  constraint event_guest_contact_preference_status_valid check (
    consent_status in ('UNKNOWN','OPTED_IN','OPTED_OUT')
  ),
  constraint event_guest_contact_preference_source_valid check (
    source is null or char_length(source) <= 240
  )
);

create table public.event_guest_communication_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null,
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  guest_id uuid references public.guests(id) on delete set null,
  recipient_name text not null,
  channel text not null,
  destination text,
  consent_snapshot text not null default 'UNKNOWN',
  rendered_message text not null,
  delivery_status text not null default 'READY',
  exclusion_reason text,
  result_reference text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_guest_recipient_campaign_fk
    foreign key (campaign_id, wedding_id)
    references public.event_guest_communication_campaigns(id, wedding_id)
    on delete cascade,
  constraint event_guest_recipient_unique unique (campaign_id, guest_id),
  constraint event_guest_recipient_name_valid check (
    btrim(recipient_name) <> '' and char_length(recipient_name) <= 180
  ),
  constraint event_guest_recipient_channel_valid check (channel in ('WHATSAPP','EMAIL')),
  constraint event_guest_recipient_destination_valid check (
    destination is null or char_length(destination) <= 320
  ),
  constraint event_guest_recipient_consent_valid check (
    consent_snapshot in ('UNKNOWN','OPTED_IN','OPTED_OUT')
  ),
  constraint event_guest_recipient_message_valid check (
    btrim(rendered_message) <> '' and char_length(rendered_message) <= 2000
  ),
  constraint event_guest_recipient_delivery_valid check (
    delivery_status in ('READY','EXCLUDED','EXPORTED','SENT','DELIVERED','FAILED','OPTED_OUT')
  ),
  constraint event_guest_recipient_exclusion_valid check (
    exclusion_reason is null or char_length(exclusion_reason) <= 180
  ),
  constraint event_guest_recipient_reference_valid check (
    result_reference is null or char_length(result_reference) <= 240
  )
);

create table public.event_guest_communication_activity (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null,
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  action text not null,
  actor_user_id text not null,
  version integer not null,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint event_guest_communication_activity_campaign_fk
    foreign key (campaign_id, wedding_id)
    references public.event_guest_communication_campaigns(id, wedding_id)
    on delete cascade,
  constraint event_guest_communication_activity_action_valid check (
    action in ('CREATED','DRAFT_SAVED','APPROVED','EXPORTED','SENT')
  ),
  constraint event_guest_communication_activity_version_valid check (version >= 1),
  constraint event_guest_communication_activity_snapshot_valid check (
    jsonb_typeof(snapshot) = 'object'
  )
);

create index event_guest_campaign_event_idx
  on public.event_guest_communication_campaigns(wedding_id, status, scheduled_for);
create index event_guest_preference_event_idx
  on public.event_guest_contact_preferences(wedding_id, channel, consent_status);
create index event_guest_recipient_campaign_idx
  on public.event_guest_communication_recipients(campaign_id, delivery_status);
create index event_guest_communication_activity_idx
  on public.event_guest_communication_activity(campaign_id, created_at desc);

create trigger tr_event_guest_campaign_updated before update
  on public.event_guest_communication_campaigns for each row
  execute function public.update_updated_at();
create trigger tr_event_guest_contact_preference_updated before update
  on public.event_guest_contact_preferences for each row
  execute function public.update_updated_at();
create trigger tr_event_guest_recipient_updated before update
  on public.event_guest_communication_recipients for each row
  execute function public.update_updated_at();

create or replace function public.validate_event_guest_communication_scope()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if tg_table_name = 'event_guest_communication_campaigns' then
    if new.wedding_event_id is not null and not exists (
      select 1 from public.wedding_events
      where id = new.wedding_event_id and wedding_id = new.wedding_id
    ) then
      raise foreign_key_violation using message = 'Function belongs to another event';
    end if;
  elsif tg_table_name in ('event_guest_contact_preferences','event_guest_communication_recipients') then
    if new.guest_id is not null and not exists (
      select 1
      from public.weddings wedding
      join public.guest_lists guest_list
        on guest_list.client_profile_id = wedding.client_profile_id
      join public.guests guest on guest.guest_list_id = guest_list.id
      where wedding.id = new.wedding_id and guest.id = new.guest_id
    ) then
      raise foreign_key_violation using message = 'Guest belongs to another event client';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.validate_event_guest_communication_scope()
  from public, anon, authenticated;
create trigger tr_event_guest_campaign_scope before insert or update of wedding_id, wedding_event_id
  on public.event_guest_communication_campaigns for each row
  execute function public.validate_event_guest_communication_scope();
create trigger tr_event_guest_preference_scope before insert or update of wedding_id, guest_id
  on public.event_guest_contact_preferences for each row
  execute function public.validate_event_guest_communication_scope();
create trigger tr_event_guest_recipient_scope before insert or update of wedding_id, guest_id
  on public.event_guest_communication_recipients for each row
  execute function public.validate_event_guest_communication_scope();

create or replace function public.prevent_guest_communication_activity_mutation()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if pg_trigger_depth() > 1 and not exists (
    select 1 from public.event_guest_communication_campaigns where id = old.campaign_id
  ) then
    return old;
  end if;
  raise object_not_in_prerequisite_state using
    message = 'Guest communication activity is append-only';
end;
$$;
revoke all on function public.prevent_guest_communication_activity_mutation()
  from public, anon, authenticated;
create trigger tr_event_guest_communication_activity_append_only before update or delete
  on public.event_guest_communication_activity for each row
  execute function public.prevent_guest_communication_activity_mutation();

create or replace function public.prevent_exported_recipient_content_change()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_status text;
begin
  select status into v_status
  from public.event_guest_communication_campaigns
  where id = old.campaign_id and wedding_id = old.wedding_id;
  if v_status in ('EXPORTED','SENT') and (
    new.guest_id is distinct from old.guest_id
    or new.recipient_name is distinct from old.recipient_name
    or new.channel is distinct from old.channel
    or new.destination is distinct from old.destination
    or new.consent_snapshot is distinct from old.consent_snapshot
    or new.rendered_message is distinct from old.rendered_message
    or new.exclusion_reason is distinct from old.exclusion_reason
  ) then
    raise check_violation using message = 'Exported recipient snapshots are immutable';
  end if;
  return new;
end;
$$;
revoke all on function public.prevent_exported_recipient_content_change()
  from public, anon, authenticated;
create trigger tr_event_guest_recipient_snapshot_immutable before update
  on public.event_guest_communication_recipients for each row
  execute function public.prevent_exported_recipient_content_change();

create or replace function public.save_guest_communication_campaign(
  p_wedding_id uuid,
  p_campaign_id uuid,
  p_expected_version integer,
  p_campaign jsonb,
  p_actor_user_id text
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_campaign public.event_guest_communication_campaigns%rowtype;
begin
  if jsonb_typeof(p_campaign) <> 'object' then
    raise check_violation using message = 'Invalid campaign snapshot';
  end if;

  if p_campaign_id is null then
    if p_expected_version is not null then
      raise check_violation using message = 'New campaign cannot have a version';
    end if;
    insert into public.event_guest_communication_campaigns (
      wedding_id, wedding_event_id, campaign_type, title, message_body, channel,
      audience_definition, scheduled_for, created_by, updated_by
    ) values (
      p_wedding_id,
      nullif(p_campaign->>'weddingEventId','')::uuid,
      p_campaign->>'campaignType',
      p_campaign->>'title',
      p_campaign->>'messageBody',
      p_campaign->>'channel',
      coalesce(p_campaign->'audience','{}'::jsonb),
      nullif(p_campaign->>'scheduledFor','')::timestamptz,
      p_actor_user_id,
      p_actor_user_id
    ) returning * into v_campaign;
    insert into public.event_guest_communication_activity (
      campaign_id, wedding_id, action, actor_user_id, version, snapshot
    ) values (
      v_campaign.id, p_wedding_id, 'CREATED', p_actor_user_id, v_campaign.version,
      jsonb_build_object('status', v_campaign.status, 'type', v_campaign.campaign_type)
    );
  else
    select * into v_campaign
    from public.event_guest_communication_campaigns
    where id = p_campaign_id and wedding_id = p_wedding_id
    for update;
    if not found then raise foreign_key_violation using message = 'Campaign not found'; end if;
    if v_campaign.status <> 'DRAFT' then
      raise check_violation using message = 'Only draft campaigns can be edited';
    end if;
    if p_expected_version is null or p_expected_version <> v_campaign.version then
      raise check_violation using message = 'Campaign changed; reload before saving';
    end if;
    update public.event_guest_communication_campaigns set
      wedding_event_id = nullif(p_campaign->>'weddingEventId','')::uuid,
      campaign_type = p_campaign->>'campaignType',
      title = p_campaign->>'title',
      message_body = p_campaign->>'messageBody',
      channel = p_campaign->>'channel',
      audience_definition = coalesce(p_campaign->'audience','{}'::jsonb),
      scheduled_for = nullif(p_campaign->>'scheduledFor','')::timestamptz,
      version = version + 1,
      updated_by = p_actor_user_id
    where id = p_campaign_id
    returning * into v_campaign;
    insert into public.event_guest_communication_activity (
      campaign_id, wedding_id, action, actor_user_id, version, snapshot
    ) values (
      v_campaign.id, p_wedding_id, 'DRAFT_SAVED', p_actor_user_id, v_campaign.version,
      jsonb_build_object('status', v_campaign.status, 'type', v_campaign.campaign_type)
    );
  end if;
  return v_campaign.id;
end;
$$;

create or replace function public.transition_guest_communication_campaign(
  p_wedding_id uuid,
  p_campaign_id uuid,
  p_expected_version integer,
  p_next_status text,
  p_actor_user_id text,
  p_payload jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_campaign public.event_guest_communication_campaigns%rowtype;
  v_payload jsonb := coalesce(p_payload, '[]'::jsonb);
  v_ready integer;
  v_excluded integer;
begin
  select * into v_campaign
  from public.event_guest_communication_campaigns
  where id = p_campaign_id and wedding_id = p_wedding_id
  for update;
  if not found then raise foreign_key_violation using message = 'Campaign not found'; end if;
  if p_expected_version is null or p_expected_version <> v_campaign.version then
    raise check_violation using message = 'Campaign changed; reload before continuing';
  end if;
  if not (
    (v_campaign.status = 'DRAFT' and p_next_status = 'APPROVED')
    or (v_campaign.status = 'APPROVED' and p_next_status = 'EXPORTED')
    or (v_campaign.status = 'EXPORTED' and p_next_status = 'SENT')
  ) then
    raise check_violation using message = 'Invalid guest communication transition';
  end if;
  if jsonb_typeof(v_payload) <> 'array' or jsonb_array_length(v_payload) > 2000 then
    raise check_violation using message = 'Invalid guest communication payload';
  end if;

  if p_next_status = 'APPROVED' then
    delete from public.event_guest_communication_recipients where campaign_id = p_campaign_id;
    insert into public.event_guest_communication_recipients (
      campaign_id, wedding_id, guest_id, recipient_name, channel, destination,
      consent_snapshot, rendered_message, delivery_status, exclusion_reason
    )
    select
      p_campaign_id,
      p_wedding_id,
      input."guestId",
      input."recipientName",
      input.channel,
      nullif(input.destination,''),
      input."consentSnapshot",
      input."renderedMessage",
      case
        when input."consentSnapshot" = 'OPTED_OUT' then 'EXCLUDED'
        when nullif(input.destination,'') is null then 'EXCLUDED'
        when nullif(input."exclusionReason",'') is not null then 'EXCLUDED'
        else 'READY'
      end,
      case
        when input."consentSnapshot" = 'OPTED_OUT' then 'OPTED_OUT'
        when nullif(input.destination,'') is null then 'MISSING_DESTINATION'
        else nullif(input."exclusionReason",'')
      end
    from jsonb_to_recordset(v_payload) as input(
      "guestId" uuid,
      "recipientName" text,
      channel text,
      destination text,
      "consentSnapshot" text,
      "renderedMessage" text,
      "exclusionReason" text
    );
    update public.event_guest_communication_campaigns set
      status = 'APPROVED', approved_by = p_actor_user_id, approved_at = now(),
      version = version + 1, updated_by = p_actor_user_id
    where id = p_campaign_id returning * into v_campaign;
  elsif p_next_status = 'EXPORTED' then
    update public.event_guest_communication_recipients
      set delivery_status = 'EXPORTED'
      where campaign_id = p_campaign_id and delivery_status = 'READY';
    update public.event_guest_communication_campaigns set
      status = 'EXPORTED', exported_by = p_actor_user_id, exported_at = now(),
      version = version + 1, updated_by = p_actor_user_id
    where id = p_campaign_id returning * into v_campaign;
  else
    update public.event_guest_communication_recipients recipient set
      delivery_status = case
        when result.status in ('SENT','DELIVERED','FAILED','OPTED_OUT') then result.status
        else recipient.delivery_status
      end,
      result_reference = nullif(result.reference,''),
      delivered_at = case when result.status = 'DELIVERED' then now() else recipient.delivered_at end
    from jsonb_to_recordset(v_payload) as result(
      "guestId" uuid,
      status text,
      reference text
    )
    where recipient.campaign_id = p_campaign_id
      and recipient.guest_id = result."guestId"
      and recipient.delivery_status <> 'EXCLUDED';
    update public.event_guest_communication_campaigns set
      status = 'SENT', sent_by = p_actor_user_id, sent_at = now(),
      version = version + 1, updated_by = p_actor_user_id
    where id = p_campaign_id returning * into v_campaign;
  end if;

  select count(*) filter (where delivery_status <> 'EXCLUDED'),
         count(*) filter (where delivery_status = 'EXCLUDED')
    into v_ready, v_excluded
  from public.event_guest_communication_recipients
  where campaign_id = p_campaign_id;
  insert into public.event_guest_communication_activity (
    campaign_id, wedding_id, action, actor_user_id, version, snapshot
  ) values (
    p_campaign_id, p_wedding_id, p_next_status, p_actor_user_id, v_campaign.version,
    jsonb_build_object('status', p_next_status, 'eligible', v_ready, 'excluded', v_excluded)
  );
  return p_campaign_id;
end;
$$;

alter table public.event_guest_communication_campaigns enable row level security;
alter table public.event_guest_contact_preferences enable row level security;
alter table public.event_guest_communication_recipients enable row level security;
alter table public.event_guest_communication_activity enable row level security;

revoke all on table public.event_guest_communication_campaigns from public, anon, authenticated;
revoke all on table public.event_guest_contact_preferences from public, anon, authenticated;
revoke all on table public.event_guest_communication_recipients from public, anon, authenticated;
revoke all on table public.event_guest_communication_activity from public, anon, authenticated;

grant select, insert, update, delete on table public.event_guest_communication_campaigns to service_role;
grant select, insert, update, delete on table public.event_guest_contact_preferences to service_role;
grant select, insert, update, delete on table public.event_guest_communication_recipients to service_role;
grant select, insert on table public.event_guest_communication_activity to service_role;

revoke all on function public.save_guest_communication_campaign(uuid,uuid,integer,jsonb,text)
  from public, anon, authenticated;
grant execute on function public.save_guest_communication_campaign(uuid,uuid,integer,jsonb,text)
  to service_role;
revoke all on function public.transition_guest_communication_campaign(uuid,uuid,integer,text,text,jsonb)
  from public, anon, authenticated;
grant execute on function public.transition_guest_communication_campaign(uuid,uuid,integer,text,text,jsonb)
  to service_role;
