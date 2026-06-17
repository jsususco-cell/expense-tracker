-- Run this in your Supabase project: SQL Editor -> New query -> paste -> Run.
-- It creates the two tables the app needs plus row-level security so each
-- signed-in user can only ever read or write their own data.

-- One budget row per user (holds the starting balance).
create table if not exists public.budgets (
  user_id uuid primary key references auth.users on delete cascade,
  starting_balance numeric not null default 0,
  updated_at timestamptz not null default now()
);

-- Many expenses per user.
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  amount numeric not null default 0,
  category text not null default 'General',
  created_at timestamptz not null default now()
);

create index if not exists expenses_user_id_idx on public.expenses (user_id);

-- Lock the tables down.
alter table public.budgets enable row level security;
alter table public.expenses enable row level security;

-- Each user only sees / changes their own rows.
drop policy if exists "own budget" on public.budgets;
create policy "own budget" on public.budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own expenses" on public.expenses;
create policy "own expenses" on public.expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
