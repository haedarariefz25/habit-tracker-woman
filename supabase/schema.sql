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

create table if not exists public.cycle_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_period_start date,
  cycle_length integer not null default 28 check (cycle_length between 20 and 40),
  period_length integer not null default 5 check (period_length between 2 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  mood_score integer not null check (mood_score between 1 and 10),
  energy_level integer not null check (energy_level between 1 and 10),
  emotions text[] not null default '{}',
  tags text[] not null default '{}',
  prompt_category text not null default 'self-love'
    check (prompt_category in ('self-love', 'anxiety', 'career', 'relationship', 'healing')),
  prompt_text text not null,
  highlight text,
  content text,
  cycle_day integer,
  cycle_phase text
    check (cycle_phase in ('menstrual', 'follicular', 'ovulation', 'luteal')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

create index if not exists habits_user_created_idx on public.habits (user_id, created_at);
create index if not exists habit_checks_user_date_idx on public.habit_checks (user_id, check_date);
create index if not exists habit_checks_habit_date_idx on public.habit_checks (habit_id, check_date);
create index if not exists journal_entries_user_date_idx on public.journal_entries (user_id, entry_date desc);
create index if not exists journal_entries_phase_idx on public.journal_entries (user_id, cycle_phase);

alter table public.habits enable row level security;
alter table public.habit_checks enable row level security;
alter table public.user_settings enable row level security;
alter table public.cycle_settings enable row level security;
alter table public.journal_entries enable row level security;

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

drop policy if exists "Users can read own cycle settings" on public.cycle_settings;
create policy "Users can read own cycle settings"
on public.cycle_settings for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own cycle settings" on public.cycle_settings;
create policy "Users can insert own cycle settings"
on public.cycle_settings for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own cycle settings" on public.cycle_settings;
create policy "Users can update own cycle settings"
on public.cycle_settings for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own cycle settings" on public.cycle_settings;
create policy "Users can delete own cycle settings"
on public.cycle_settings for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read own journal entries" on public.journal_entries;
create policy "Users can read own journal entries"
on public.journal_entries for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own journal entries" on public.journal_entries;
create policy "Users can insert own journal entries"
on public.journal_entries for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own journal entries" on public.journal_entries;
create policy "Users can update own journal entries"
on public.journal_entries for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own journal entries" on public.journal_entries;
create policy "Users can delete own journal entries"
on public.journal_entries for delete
to authenticated
using (auth.uid() = user_id);
