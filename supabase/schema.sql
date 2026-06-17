-- Personal budgeting app schema.
-- Run this in your Supabase project: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run: it drops and recreates the app tables (you lose existing rows).

-- Clean up the old single-balance prototype tables if they exist.
drop table if exists public.expenses cascade;
drop table if exists public.budgets cascade;

-- And drop the new ones so re-running gives a clean slate.
drop table if exists public.transactions cascade;
drop table if exists public.savings_goals cascade;
drop table if exists public.category_budgets cascade;
drop table if exists public.budget_settings cascade;

-- ---------------------------------------------------------------------------
-- Transactions: every income and expense entry lives here.
-- ---------------------------------------------------------------------------
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount numeric not null check (amount >= 0),
  category text not null default 'Others',   -- expense category or income source
  payment_method text,                        -- Cash, Card, Bank Transfer, E-Wallet...
  description text,
  notes text,
  txn_date date not null default current_date,
  recurrence text not null default 'none'
    check (recurrence in ('none', 'daily', 'weekly', 'monthly')),
  created_at timestamptz not null default now()
);
create index transactions_user_date_idx on public.transactions (user_id, txn_date desc);

-- ---------------------------------------------------------------------------
-- Budget settings: one row per user (daily/weekly/monthly limits + savings).
-- ---------------------------------------------------------------------------
create table public.budget_settings (
  user_id uuid primary key references auth.users on delete cascade,
  daily_limit numeric not null default 0,
  weekly_limit numeric not null default 0,
  monthly_limit numeric not null default 0,
  weekly_savings_target numeric not null default 0,
  monthly_savings_target numeric not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Per-category monthly budgets (drives the dashboard "Budget Overview" bars).
-- ---------------------------------------------------------------------------
create table public.category_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  category text not null,
  monthly_amount numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, category)
);

-- ---------------------------------------------------------------------------
-- Savings goals.
-- ---------------------------------------------------------------------------
create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  target_amount numeric not null default 0,
  current_amount numeric not null default 0,
  target_date date,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row level security: every user only ever sees their own rows.
-- ---------------------------------------------------------------------------
alter table public.transactions enable row level security;
alter table public.budget_settings enable row level security;
alter table public.category_budgets enable row level security;
alter table public.savings_goals enable row level security;

create policy "own transactions" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own budget_settings" on public.budget_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own category_budgets" on public.category_budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own savings_goals" on public.savings_goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
