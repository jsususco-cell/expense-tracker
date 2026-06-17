"use client";

import { useEffect, useMemo, useState } from "react";
import {
  supabase,
  type Transaction,
  type BudgetSettings,
  type CategoryBudget,
  type SavingsGoal,
} from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import { peso, pct } from "@/lib/format";
import { colorFor } from "@/lib/constants";
import {
  totalsFor,
  expensesByCategory,
  dailyExpenseSeries,
  monthlySeries,
  todayStr,
  toDateStr,
  startOfMonth,
  computeAllocation,
} from "@/lib/finance";
import AllocationCard from "@/components/AllocationCard";
import {
  Card,
  StatCard,
  ProgressBar,
  BarChart,
  PageHeader,
} from "@/components/ui";

export default function DashboardPage() {
  const { userId, loading } = useAuth();
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<BudgetSettings | null>(null);
  const [catBudgets, setCatBudgets] = useState<CategoryBudget[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const [tx, s, cb, g] = await Promise.all([
        supabase.from("transactions").select("*"),
        supabase
          .from("budget_settings")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase.from("category_budgets").select("*").order("created_at"),
        supabase.from("savings_goals").select("*").order("created_at"),
      ]);
      setTxns((tx.data as Transaction[]) ?? []);
      setSettings((s.data as BudgetSettings) ?? null);
      setCatBudgets((cb.data as CategoryBudget[]) ?? []);
      setGoals((g.data as SavingsGoal[]) ?? []);
      setLoaded(true);
    })();
  }, [userId]);

  const today = todayStr();
  const monthStart = toDateStr(startOfMonth());

  const monthTotals = useMemo(
    () => totalsFor(txns, monthStart, today),
    [txns, monthStart, today]
  );

  const monthSpendByCat = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of txns) {
      if (t.type !== "expense") continue;
      if (t.txn_date < monthStart || t.txn_date > today) continue;
      map.set(t.category, (map.get(t.category) ?? 0) + Number(t.amount));
    }
    return map;
  }, [txns, monthStart, today]);

  const dailySeries = useMemo(() => dailyExpenseSeries(txns, 7), [txns]);
  const monthlyExpense = useMemo(
    () => monthlySeries(txns, "expense", 6),
    [txns]
  );
  const monthlySavings = useMemo(
    () => monthlySeries(txns, "savings", 6),
    [txns]
  );
  const catBreakdown = useMemo(
    () => expensesByCategory(txns, monthStart, today).slice(0, 6),
    [txns, monthStart, today]
  );
  const catTotal = catBreakdown.reduce((s, c) => s + c.total, 0);

  const remainingMonthly = settings
    ? settings.monthly_limit - monthTotals.expenses
    : 0;

  const allocation = computeAllocation(
    settings?.expected_monthly_income ?? 0,
    settings?.monthly_limit ?? 0,
    goals,
    monthTotals.income
  );

  if (loading || !loaded) {
    return (
      <p className="py-10 text-center text-slate-400">Loading your budget…</p>
    );
  }

  const monthName = new Date().toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <PageHeader title="Dashboard">
        <span className="text-sm text-slate-400">{monthName}</span>
      </PageHeader>

      {/* Summary cards */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Income" value={peso(monthTotals.income)} tone="positive" />
        <StatCard
          label="Expenses"
          value={peso(monthTotals.expenses)}
          tone="negative"
        />
        <StatCard
          label="Savings"
          value={peso(monthTotals.savings)}
          tone={monthTotals.savings >= 0 ? "positive" : "negative"}
        />
        <StatCard
          label="Remaining budget"
          value={settings?.monthly_limit ? peso(remainingMonthly) : "—"}
          tone={remainingMonthly >= 0 ? "default" : "negative"}
          sub={
            settings?.monthly_limit
              ? `of ${peso(settings.monthly_limit)}`
              : "Set a monthly limit"
          }
        />
        <StatCard
          label="Savings rate"
          value={pct(monthTotals.savingsRate)}
          tone={monthTotals.savingsRate >= 0 ? "positive" : "negative"}
        />
      </section>

      {/* Allocation overview — income vs limits + goals */}
      <div className="mt-6">
        <AllocationCard allocation={allocation} compact />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Budget overview */}
        <Card className="lg:col-span-2">
          <h2 className="mb-4 font-medium">Budget Overview (this month)</h2>
          {catBudgets.length === 0 ? (
            <p className="text-sm text-slate-400">
              No category budgets set.{" "}
              <a href="/budgets" className="text-indigo-300 hover:underline">
                Add some →
              </a>
            </p>
          ) : (
            <div className="space-y-4">
              {catBudgets.map((cb) => (
                <ProgressBar
                  key={cb.id}
                  label={cb.category}
                  current={monthSpendByCat.get(cb.category) ?? 0}
                  total={cb.monthly_amount}
                  invert
                />
              ))}
            </div>
          )}
        </Card>

        {/* Category breakdown */}
        <Card>
          <h2 className="mb-4 font-medium">Spending by Category</h2>
          {catBreakdown.length === 0 ? (
            <p className="text-sm text-slate-400">No expenses this month.</p>
          ) : (
            <ul className="space-y-3">
              {catBreakdown.map((c, i) => {
                const p = catTotal > 0 ? (c.total / catTotal) * 100 : 0;
                return (
                  <li key={c.category}>
                    <div className="flex justify-between text-sm">
                      <span>{c.category}</span>
                      <span className="text-slate-400">
                        {peso(c.total)} · {pct(p)}
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${p}%`,
                          backgroundColor: colorFor(i),
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* Trends */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <h2 className="mb-4 font-medium">Daily Expenses (last 7 days)</h2>
          <BarChart data={dailySeries} color="#f472b6" />
        </Card>
        <Card>
          <h2 className="mb-4 font-medium">Monthly Expenses</h2>
          <BarChart data={monthlyExpense} color="#818cf8" />
        </Card>
        <Card>
          <h2 className="mb-4 font-medium">Monthly Savings</h2>
          <BarChart data={monthlySavings} color="#34d399" />
        </Card>
      </div>

      {/* Goals */}
      <Card className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-medium">Savings Goals</h2>
          <a href="/goals" className="text-sm text-indigo-300 hover:underline">
            Manage →
          </a>
        </div>
        {goals.length === 0 ? (
          <p className="text-sm text-slate-400">No goals yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {goals.map((g) => (
              <ProgressBar
                key={g.id}
                label={g.name}
                current={Number(g.current_amount)}
                total={Number(g.target_amount)}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
