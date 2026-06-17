-- Migration 002: bi-weekly income recurrence + expected monthly income.
-- Non-destructive — run this in Supabase SQL Editor; it keeps your data.

-- 1) Allow 'biweekly' as a recurrence value.
alter table public.transactions
  drop constraint if exists transactions_recurrence_check;
alter table public.transactions
  add constraint transactions_recurrence_check
  check (recurrence in ('none', 'daily', 'weekly', 'biweekly', 'monthly'));

-- 2) Expected monthly income used by the allocation overview
--    (0 = fall back to actual income for the current month).
alter table public.budget_settings
  add column if not exists expected_monthly_income numeric not null default 0;
