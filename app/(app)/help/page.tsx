"use client";

import { useState } from "react";
import { Card, PageHeader } from "@/components/ui";

const STEPS = [
  {
    title: "1. Add your income & expenses",
    body: "Go to Transactions. Use + Income or + Expense to record money in and out. Pick a category, payment method, date, and (optionally) a recurrence like Bi-weekly or Monthly for things that repeat such as salary or rent.",
  },
  {
    title: "2. Set your budgets",
    body: "On Budgets, set daily / weekly / monthly spending limits, savings targets, and per-category budgets. Enter your expected monthly income so the Allocation Overview can check that your limits + goals fit your income.",
  },
  {
    title: "3. Run a budget cycle",
    body: "On Budget Cycles, set a weekly or bi-weekly budget. When you start a new cycle, the previous one moves to History where you can press Analyze to see where your money went.",
  },
  {
    title: "4. Create savings goals",
    body: "On Goals, add targets like an Emergency Fund with an amount and deadline. Track progress and log contributions. The app suggests a monthly contribution to stay on track.",
  },
  {
    title: "5. Watch the Dashboard & Reports",
    body: "The Dashboard shows your income, expenses, savings, balance over time, and budget progress. Reports break things down weekly, monthly, or annually.",
  },
];

const FAQS = [
  {
    q: "What is the difference between Budgets and Budget Cycles?",
    a: "Budgets holds your ongoing limits and targets (daily/weekly/monthly) plus per-category budgets. Budget Cycles is for setting a fresh spending budget every week or two weeks and keeping a history of each one so you can compare past periods.",
  },
  {
    q: "What is 'Balance Over Time'?",
    a: "It is your running balance — every month's income minus expenses, added up over time. It shows whether your overall money position is growing or shrinking month to month.",
  },
  {
    q: "What does 'Over-allocated' mean in the Allocation Overview?",
    a: "It means your monthly spending limit plus your savings-goal contributions add up to more than your income. Lower a limit, push out a goal deadline, or raise your expected income to get back in balance.",
  },
  {
    q: "How is the suggested goal contribution calculated?",
    a: "Remaining amount (target minus current) divided by the number of whole months until the goal's target date. Goals without a deadline don't suggest a monthly amount.",
  },
  {
    q: "What is 'Expected monthly income' for?",
    a: "It's the income figure the Allocation Overview plans against. Leave it blank and the app uses your actual income recorded for the current month instead — useful when your income varies.",
  },
  {
    q: "Is my data private?",
    a: "Yes. Every record is tied to your account and protected by row-level security, so only you can see or change your data.",
  },
  {
    q: "How do recurring transactions work?",
    a: "The recurrence label (Daily, Weekly, Bi-weekly, Monthly) tags a transaction so you can recognize repeating items. It does not auto-create future entries yet — add each actual amount when it happens, which is handy when amounts vary.",
  },
];

function Accordion({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/10 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 py-3 text-left"
      >
        <span className="font-medium">{q}</span>
        <span className="text-slate-400">{open ? "−" : "+"}</span>
      </button>
      {open && <p className="pb-3 text-sm text-slate-300">{a}</p>}
    </div>
  );
}

export default function HelpPage() {
  return (
    <div>
      <PageHeader title="Help & Guide" />

      <Card className="mb-6">
        <h2 className="mb-4 font-medium">Getting started</h2>
        <ol className="space-y-4">
          {STEPS.map((s) => (
            <li key={s.title}>
              <p className="font-medium text-indigo-200">{s.title}</p>
              <p className="mt-1 text-sm text-slate-300">{s.body}</p>
            </li>
          ))}
        </ol>
      </Card>

      <Card>
        <h2 className="mb-2 font-medium">Frequently asked questions</h2>
        <div>
          {FAQS.map((f) => (
            <Accordion key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
      </Card>
    </div>
  );
}
