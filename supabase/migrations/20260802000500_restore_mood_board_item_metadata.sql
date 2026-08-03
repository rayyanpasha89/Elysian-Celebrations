alter table public.mood_board_items
  add column if not exists category text,
  add column if not exists created_at timestamptz;

update public.mood_board_items
set category = 'Decor'
where category is null;

update public.mood_board_items
set created_at = now()
where created_at is null;

alter table public.mood_board_items
  alter column category set default 'Decor',
  alter column category set not null,
  alter column created_at set default now(),
  alter column created_at set not null;
