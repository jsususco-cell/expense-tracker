# ₱ Budget

A personal budgeting app: track income & expenses, set daily / weekly / monthly
budgets, hit savings goals, and see it all on a dashboard. Data syncs to the
cloud (Supabase) and is private to each signed-in account. Currency is PHP (₱).

Built with Next.js (App Router) + Tailwind CSS + Supabase. Deploys to Vercel.

## Features

- **Dashboard** — income / expenses / savings / remaining budget / savings rate,
  budget-overview bars, spending & savings trend charts, goal progress
- **Transactions** — add/edit/delete income & expenses with category, payment
  method, date, description, notes, recurrence; search & filter by text, type,
  category, and date range
- **Budgets** — daily / weekly / monthly spending limits, weekly & monthly
  savings targets, and per-category monthly budgets with live progress
- **Goals** — multiple savings goals with target, deadline, progress & quick
  contributions
- **Reports** — weekly / monthly / annual breakdown by category, savings rate,
  budget adherence, top categories
- **Accounts** — email/password auth; row-level security keeps each user's data
  private

> Pages marked "add later" in the spec (receipt upload, push notifications,
> debt tracking, cash-flow forecast, AI insights) are not in this MVP.

---

## 1. Set up Supabase

1. Create a free project at <https://supabase.com>.
2. **SQL Editor → New query**, paste all of [`supabase/schema.sql`](supabase/schema.sql),
   and **Run**. (Re-running drops & recreates the app tables — you lose existing rows.)
3. **Project Settings → API**, copy **Project URL** and the **anon public** key.
4. **Authentication → Sign In / Providers → Email**: enable the provider and turn
   **off** "Confirm email" for instant testing.

## 2. Run locally

```bash
npm install
cp .env.local.example .env.local   # paste your Supabase URL + anon key
npm run dev
```

Open <http://localhost:3000>, sign up, and start budgeting.

## 3. Deploy to Vercel

1. Push to GitHub (already wired to `origin`): `git push`.
2. On <https://vercel.com>: **Add New → Project**, import the repo.
3. Add env vars `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. **Deploy.** Every push to `main` redeploys automatically.
