-- Whole-plan deletion previously crossed several independent PostgREST writes.
-- Keep history checks, booking cleanup, budget unlinking, and the cascading plan
-- delete inside one transaction so a late constraint failure rolls everything back.

create or replace function public.delete_event_plan(
  p_actor_user_id text,
  p_wedding_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client_profile_id uuid;
  v_plan_name text;
  v_deleted_draft_booking_count integer := 0;
  v_unlinked_booking_count integer := 0;
  v_unlinked_budget_item_count integer := 0;
begin
  if nullif(pg_catalog.btrim(p_actor_user_id), '') is null then
    raise exception 'actor user id is required' using errcode = '22004';
  end if;

  if p_wedding_id is null then
    raise exception 'event plan id is required' using errcode = '22004';
  end if;

  select wedding.client_profile_id, wedding.name
  into v_client_profile_id, v_plan_name
  from public.weddings as wedding
  join public.client_profiles as client
    on client.id = wedding.client_profile_id
  where wedding.id = p_wedding_id
    and client.user_id = p_actor_user_id
  for update of wedding;

  if v_client_profile_id is null then
    raise exception 'event plan not found for actor' using errcode = '42501';
  end if;

  -- Freeze the currently linked booking set before deciding which history may
  -- be removed and which records must survive without a planner reference.
  perform booking.id
  from public.bookings as booking
  join public.wedding_events as event
    on event.id = booking.wedding_event_id
  where event.wedding_id = p_wedding_id
  order by booking.id
  for update of booking;

  if exists (
    select 1
    from public.payments as payment
    where payment.wedding_id = p_wedding_id
      or exists (
        select 1
        from public.bookings as booking
        join public.wedding_events as event
          on event.id = booking.wedding_event_id
        where event.wedding_id = p_wedding_id
          and booking.id = payment.booking_id
      )
  ) or exists (
    select 1
    from public.billing_invoices as invoice
    where invoice.wedding_id = p_wedding_id
      or exists (
        select 1
        from public.bookings as booking
        join public.wedding_events as event
          on event.id = booking.wedding_event_id
        where event.wedding_id = p_wedding_id
          and booking.id = invoice.booking_id
      )
  ) then
    raise exception 'event plan has billing history' using errcode = '55000';
  end if;

  delete from public.bookings as booking
  using public.wedding_events as event
  where booking.wedding_event_id = event.id
    and event.wedding_id = p_wedding_id
    and booking.status in ('INQUIRY', 'QUOTE_SENT');
  get diagnostics v_deleted_draft_booking_count = row_count;

  update public.bookings as booking
  set wedding_event_id = null,
      updated_at = pg_catalog.now()
  from public.wedding_events as event
  where booking.wedding_event_id = event.id
    and event.wedding_id = p_wedding_id;
  get diagnostics v_unlinked_booking_count = row_count;

  update public.budget_items as item
  set wedding_event_id = null
  from public.wedding_events as event
  where item.wedding_event_id = event.id
    and event.wedding_id = p_wedding_id;
  get diagnostics v_unlinked_budget_item_count = row_count;

  delete from public.weddings as wedding
  where wedding.id = p_wedding_id
    and wedding.client_profile_id = v_client_profile_id;

  if not found then
    raise exception 'event plan disappeared during deletion'
      using errcode = '40001';
  end if;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'deletedPlans', pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('id', p_wedding_id, 'name', v_plan_name)
    ),
    'deletedDraftSelections', v_deleted_draft_booking_count,
    'unlinkedBookings', v_unlinked_booking_count,
    'unlinkedBudgetItems', v_unlinked_budget_item_count
  );
end;
$$;

revoke execute on function public.delete_event_plan(text, uuid)
  from public, anon, authenticated;
grant execute on function public.delete_event_plan(text, uuid)
  to service_role;
