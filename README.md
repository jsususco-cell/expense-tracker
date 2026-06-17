# Budget

A simple personal budgeting app. Set a **starting balance**, log **expenses**,
and see your **ending balance** update live on the **dashboard**. Data syncs to
the cloud (Supabase) and is private to each signed-in account.

Built with Next.js (App Router) + Tailwind CSS + Supabase. Deploys to Vercel.

## Features

- Email/password accounts (Supabase Auth) — your budget is private to you
- Editable starting balance
- Add / delete expenses with category and amount
- Live total expenses and ending balance
- Spending breakdown by category

---

## 1. Set up Supabase (the database)

1. Create a free project at <https://supabase.com>.
2. In the dashboard go to **SQL Editor → New query**, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql), and click **Run**. This creates
   the tables and security rules.
3. Go to **Project Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. (Optional, easiest for testing) Under **Authentication → Providers → Email**,
   turn **off** "Confirm email" so you can sign in immediately after signing up.

## 2. Run locally

```bash
npm install
cp .env.local.example .env.local   # then paste your Supabase values in
npm run dev
```

Open <http://localhost:3000>, sign up, and start budgeting.

## 3. Deploy to GitHub + Vercel

```bash
git init
git add .
git commit -m "Initial commit"
# create an empty repo on github.com, then:
git remote add origin https://github.com/<you>/budget-app.git
git branch -M main
git push -u origin main
```

Then on <https://vercel.com>:

1. **Add New → Project** and import your GitHub repo.
2. Under **Environment Variables**, add `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` with the same values as your `.env.local`.
3. Click **Deploy**.

Every push to `main` will redeploy automatically.
