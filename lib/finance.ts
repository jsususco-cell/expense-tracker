import type { Transaction, SavingsGoal } from "./supabase";

// ---- Date helpers (all local-time, return YYYY-MM-DD strings) ----

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayStr(): string {
  return toDateStr(new Date());
}

// Monday as start of week.
export function startOfWeek(d = new Date()): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (date.getDay() + 6) % 7; // 0 = Monday
  date.setDate(date.getDate() - day);
  return date;
}

export function startOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function inRange(dateStr: string, startStr: string, endStr: string) {
  return dateStr >= startStr && dateStr <= endStr;
}

// ---- Aggregations ----

export function sumByType(
  txns: Transaction[],
  type: "income" | "expense",
  startStr?: string,
  endStr?: string
): number {
  return txns
    .filter((t) => t.type === type)
    .filter((t) =>
      startStr && endStr ? inRange(t.txn_date, startStr, endStr) : true
    )
    .reduce((s, t) => s + Number(t.amount), 0);
}

export type Totals = {
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number; // percent
};

export function totalsFor(
  txns: Transaction[],
  startStr?: string,
  endStr?: string
): Totals {
  const income = sumByType(txns, "income", startStr, endStr);
  const expenses = sumByType(txns, "expense", startStr, endStr);
  const savings = income - expenses;
  const savingsRate = income > 0 ? (savings / income) * 100 : 0;
  return { income, expenses, savings, savingsRate };
}

// Expenses grouped by category within an optional range, sorted desc.
export function expensesByCategory(
  txns: Transaction[],
  startStr?: string,
  endStr?: string
): { category: string; total: number }[] {
  const map = new Map<string, number>();
  for (const t of txns) {
    if (t.type !== "expense") continue;
    if (startStr && endStr && !inRange(t.txn_date, startStr, endStr)) continue;
    map.set(t.category, (map.get(t.category) ?? 0) + Number(t.amount));
  }
  return Array.from(map.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

// Daily expense series for the last `days` days (oldest first).
export function dailyExpenseSeries(
  txns: Transaction[],
  days = 7
): { label: string; value: number }[] {
  const out: { label: string; value: number }[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    const ds = toDateStr(d);
    const value = txns
      .filter((t) => t.type === "expense" && t.txn_date === ds)
      .reduce((s, t) => s + Number(t.amount), 0);
    out.push({
      label: d.toLocaleDateString("en-PH", { weekday: "short" }),
      value,
    });
  }
  return out;
}

// Whole months from now until a target date (minimum 1).
export function monthsUntil(dateStr: string): number {
  const target = new Date(`${dateStr}T00:00:00`);
  const now = new Date();
  const months =
    (target.getFullYear() - now.getFullYear()) * 12 +
    (target.getMonth() - now.getMonth());
  return Math.max(1, months);
}

// Suggested monthly contribution to reach a goal by its target date.
// Goals with no target date (or already met) contribute 0.
export function goalMonthlyContribution(goal: SavingsGoal): number {
  if (!goal.target_date) return 0;
  const remaining =
    Number(goal.target_amount) - Number(goal.current_amount);
  if (remaining <= 0) return 0;
  return remaining / monthsUntil(goal.target_date);
}

export type Allocation = {
  income: number; // expected monthly income
  limit: number; // monthly spending limit
  goalContrib: number; // total suggested monthly goal contributions
  leftover: number; // income - limit - goalContrib
  allocated: number; // limit + goalContrib
  overBy: number; // amount over income (0 if within)
  overAllocated: boolean;
  usedActualIncome: boolean; // true when we fell back to actual income
};

// Connects spending limits + savings goals to expected income.
export function computeAllocation(
  expectedIncome: number,
  monthlyLimit: number,
  goals: SavingsGoal[],
  actualMonthIncome: number
): Allocation {
  const usedActualIncome = !expectedIncome || expectedIncome <= 0;
  const income = usedActualIncome ? actualMonthIncome : expectedIncome;
  const goalContrib = goals.reduce(
    (s, g) => s + goalMonthlyContribution(g),
    0
  );
  const allocated = monthlyLimit + goalContrib;
  const leftover = income - allocated;
  return {
    income,
    limit: monthlyLimit,
    goalContrib,
    leftover,
    allocated,
    overBy: leftover < 0 ? -leftover : 0,
    overAllocated: leftover < 0,
    usedActualIncome,
  };
}

// Running (cumulative) balance month by month, from the first transaction
// month through the current month. balance = sum of all net up to that month.
export function runningBalanceByMonth(
  txns: Transaction[]
): { label: string; income: number; expenses: number; net: number; balance: number }[] {
  if (txns.length === 0) return [];
  const sorted = [...txns].sort((a, b) =>
    a.txn_date.localeCompare(b.txn_date)
  );
  const first = new Date(`${sorted[0].txn_date}T00:00:00`);
  const now = new Date();
  const out: {
    label: string;
    income: number;
    expenses: number;
    net: number;
    balance: number;
  }[] = [];
  let balance = 0;
  let d = new Date(first.getFullYear(), first.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  while (d <= end) {
    const start = toDateStr(d);
    const monthEnd = toDateStr(
      new Date(d.getFullYear(), d.getMonth() + 1, 0)
    );
    const income = sumByType(txns, "income", start, monthEnd);
    const expenses = sumByType(txns, "expense", start, monthEnd);
    const net = income - expenses;
    balance += net;
    out.push({
      label: d.toLocaleDateString("en-PH", {
        month: "short",
        year: "2-digit",
      }),
      income,
      expenses,
      net,
      balance,
    });
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }
  return out;
}

// Monthly series for the last `months` months (oldest first).
export function monthlySeries(
  txns: Transaction[],
  type: "income" | "expense" | "savings",
  months = 6
): { label: string; value: number }[] {
  const out: { label: string; value: number }[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = toDateStr(d);
    const end = toDateStr(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    const income = sumByType(txns, "income", start, end);
    const expenses = sumByType(txns, "expense", start, end);
    const value =
      type === "income" ? income : type === "expense" ? expenses : income - expenses;
    out.push({
      label: d.toLocaleDateString("en-PH", { month: "short" }),
      value,
    });
  }
  return out;
}
