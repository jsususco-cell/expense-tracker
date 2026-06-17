"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase, type Transaction, type BudgetSettings } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import { peso, pct } from "@/lib/format";
import { colorFor } from "@/lib/constants";
import {
  totalsFor,
  expensesByCategory,
  todayStr,
  toDateStr,
  startOfWeek,
  startOfMonth,
} from "@/lib/finance";
import { Card, StatCard, PageHeader } from "@/components/ui";

type Period = "weekly" | "monthly" | "annual";

export default function ReportsPage() {
  const { userId, loading } = useAuth();
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<BudgetSettings | null>(null);
  const [period, setPeriod] = useState<Period>("monthly");

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase.from("transactions").select("*");
      setTxns((data as Transaction[]) ?? []);
      const { data: s } = await supabase
        .from("budget_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      setSettings((s as BudgetSettings) ?? null);
    })();
  }, [userId]);

  const { start, end, label } = useMemo(() => {
    const today = todayStr();
    if (period === "weekly") {
      return {
        start: toDateStr(startOfWeek()),
        end: today,
        label: "This Week",
      };
    }
    if (period === "annual") {
      const now = new Date();
      return {
        start: toDateStr(new Date(now.getFullYear(), 0, 1)),
        end: today,
        label: `${now.getFullYear()}`,
      };
    }
    return {
      start: toDateStr(startOfMonth()),
      end: today,
      label: new Date().toLocaleDateString("en-PH", {
        month: "long",
        year: "numeric",
      }),
    };
  }, [period]);

  const totals = useMemo(
    () => totalsFor(txns, start, end),
    [txns, start, end]
  );
  const byCat = useMemo(
    () => expensesByCategory(txns, start, end),
    [txns, start, end]
  );

  // Budget adherence: spent vs the limit for the selected period.
  const limit = settings
    ? period === "weekly"
      ? settings.weekly_limit
      : period === "monthly"
        ? settings.monthly_limit
        : settings.monthly_limit * 12
    : 0;
  const adherence =
    limit > 0 ? Math.max(0, (1 - totals.expenses / limit) * 100) : null;

  if (loading) return null;

  const periods: Period[] = ["weekly", "monthly", "annual"];

  return (
    <div>
      <PageHeader title="Reports">
        <div className="flex gap-1 rounded-lg border border-white/10 p-1">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1.5 text-sm capitalize ${
                period === p
                  ? "bg-indigo-500 text-white"
                  : "text-slate-300 hover:bg-white/5"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </PageHeader>

      <p className="mb-4 text-sm text-slate-400">{label}</p>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Income" value={peso(totals.income)} tone="positive" />
        <StatCard
          label="Expenses"
          value={peso(totals.expenses)}
          tone="negative"
        />
        <StatCard
          label="Net savings"
          value={peso(totals.savings)}
          tone={totals.savings >= 0 ? "positive" : "negative"}
        />
        <StatCard
          label="Savings rate"
          value={pct(totals.savingsRate)}
          tone={totals.savingsRate >= 0 ? "positive" : "negative"}
        />
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-medium">Spending by Category</h2>
          {byCat.length === 0 ? (
            <p className="text-sm text-slate-400">No expenses in this period.</p>
          ) : (
            <ul className="space-y-3">
              {byCat.map((c, i) => {
                const p =
                  totals.expenses > 0 ? (c.total / totals.expenses) * 100 : 0;
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

        <Card>
          <h2 className="mb-4 font-medium">Key Metrics</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-400">Highest category</dt>
              <dd>
                {byCat[0]
                  ? `${byCat[0].category} (${peso(byCat[0].total)})`
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Transactions</dt>
              <dd>
                {
                  txns.filter(
                    (t) => t.txn_date >= start && t.txn_date <= end
                  ).length
                }
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Avg. expense</dt>
              <dd>
                {(() => {
                  const exp = txns.filter(
                    (t) =>
                      t.type === "expense" &&
                      t.txn_date >= start &&
                      t.txn_date <= end
                  );
                  return exp.length
                    ? peso(totals.expenses / exp.length)
                    : "—";
                })()}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Budget adherence</dt>
              <dd>
                {adherence === null ? (
                  <span className="text-slate-500">No limit set</span>
                ) : (
                  <span
                    className={
                      totals.expenses <= limit
                        ? "text-emerald-300"
                        : "text-rose-300"
                    }
                  >
                    {totals.expenses <= limit
                      ? `Within budget (${pct(adherence)} left)`
                      : `Over by ${peso(totals.expenses - limit)}`}
                  </span>
                )}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Savings rate</dt>
              <dd>{pct(totals.savingsRate)}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
