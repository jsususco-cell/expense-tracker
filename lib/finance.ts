import type { Transaction } from "./supabase";

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
