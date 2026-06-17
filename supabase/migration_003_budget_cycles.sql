-- Migration 003: budget cycles (weekly / bi-weekly budgets with history).
-- Non-destructive — run this in Supabase SQL Editor; it keeps your data.

create table if not exists public.budget_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  period_type text not null default 'biweekly'
    check (period_type in ('weekly', 'biweekly')),
  amount numeric not null default 0,
  start_date date not null,
  end_date date not null,
  status text not null default 'active'
    check (status in ('active', 'archived')),
  created_at timestamptz not null default now()
);

create index if not exists budget_periods_user_idx
  on public.budget_periods (user_id, start_date desc);

alter table public.budget_periods enable row level security;

drop policy if exists "own budget_periods" on public.budget_periods;
create policy "own budget_periods" on public.budget_periods
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
