create table if not exists wedding_event_menus (
  id uuid primary key default gen_random_uuid(),
  wedding_event_id uuid not null references wedding_events(id) on delete cascade,
  name text not null default 'Primary menu',
  meal_period text,
  service_style text,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists wedding_event_menu_items (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references wedding_event_menus(id) on delete cascade,
  name text not null,
  course text,
  dietary_tags text[] not null default '{}',
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists wedding_event_logistics (
  id uuid primary key default gen_random_uuid(),
  wedding_event_id uuid not null unique references wedding_events(id) on delete cascade,
  guest_arrival_time text,
  vendor_load_in_time text,
  family_call_time text,
  transport_notes text,
  rooming_notes text,
  weather_plan text,
  ceremony_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists wedding_event_tasks (
  id uuid primary key default gen_random_uuid(),
  wedding_event_id uuid not null references wedding_events(id) on delete cascade,
  title text not null,
  owner text,
  status text not null default 'OPEN',
  due_date timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_wedding_event_menus_event
  on wedding_event_menus(wedding_event_id, sort_order);

create index if not exists idx_wedding_event_menu_items_menu
  on wedding_event_menu_items(menu_id, sort_order);

create index if not exists idx_wedding_event_tasks_event
  on wedding_event_tasks(wedding_event_id, sort_order);

insert into wedding_event_menus (
  wedding_event_id,
  name,
  meal_period,
  service_style,
  notes,
  sort_order
)
select
  wedding_events.id,
  wedding_events.name || ' Menu',
  case
    when wedding_events.start_time is null then null
    when wedding_events.start_time < '12:00' then 'Breakfast'
    when wedding_events.start_time < '17:00' then 'Lunch'
    else 'Dinner'
  end,
  wedding_events.food_style,
  wedding_events.menu_notes,
  0
from wedding_events
where wedding_events.food_style is not null
  and not exists (
    select 1
    from wedding_event_menus
    where wedding_event_menus.wedding_event_id = wedding_events.id
  );

insert into wedding_event_tasks (
  wedding_event_id,
  title,
  owner,
  status,
  sort_order
)
select
  wedding_events.id,
  'Confirm final run of show',
  'Planner',
  'OPEN',
  0
from wedding_events
where not exists (
  select 1
  from wedding_event_tasks
  where wedding_event_tasks.wedding_event_id = wedding_events.id
    and wedding_event_tasks.title = 'Confirm final run of show'
);
