create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  emoji text not null default '🎯',
  freq text not null default 'daily' check (freq in ('daily', 'weekly', 'monthly')),
  goal integer not null default 30 check (goal > 0 and goal <= 366),
  color text not null,
  bar_color text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.habit_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  check_date date not null,
  is_done boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, check_date)
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'pink' check (theme in ('pink', 'lavender', 'minimal', 'dark')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists habits_user_created_idx on public.habits (user_id, created_at);
create index if not exists habit_checks_user_date_idx on public.habit_checks (user_id, check_date);
create index if not exists habit_checks_habit_date_idx on public.habit_checks (habit_id, check_date);

alter table public.habits enable row level security;
alter table public.habit_checks enable row level security;
alter table public.user_settings enable row level security;

drop policy if exists "Users can read own habits" on public.habits;
create policy "Users can read own habits"
on public.habits for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own habits" on public.habits;
create policy "Users can insert own habits"
on public.habits for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own habits" on public.habits;
create policy "Users can update own habits"
on public.habits for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own habits" on public.habits;
create policy "Users can delete own habits"
on public.habits for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read own habit checks" on public.habit_checks;
create policy "Users can read own habit checks"
on public.habit_checks for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own habit checks" on public.habit_checks;
create policy "Users can insert own habit checks"
on public.habit_checks for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.habits
    where habits.id = habit_checks.habit_id
      and habits.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own habit checks" on public.habit_checks;
create policy "Users can update own habit checks"
on public.habit_checks for update
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.habits
    where habits.id = habit_checks.habit_id
      and habits.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete own habit checks" on public.habit_checks;
create policy "Users can delete own habit checks"
on public.habit_checks for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read own settings" on public.user_settings;
create policy "Users can read own settings"
on public.user_settings for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own settings" on public.user_settings;
create policy "Users can insert own settings"
on public.user_settings for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own settings" on public.user_settings;
create policy "Users can update own settings"
on public.user_settings for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own settings" on public.user_settings;
create policy "Users can delete own settings"
on public.user_settings for delete
to authenticated
using (auth.uid() = user_id);
