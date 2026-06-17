"use client";

import { useEffect, useMemo, useState } from "react";
import {
  supabase,
  type Transaction,
  type BudgetPeriod,
  type PeriodType,
} from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import { peso, pct, shortDate } from "@/lib/format";
import { colorFor } from "@/lib/constants";
import {
  sumByType,
  expensesByCategory,
  todayStr,
  toDateStr,
  addDays,
} from "@/lib/finance";
import {
  Card,
  Field,
  PageHeader,
  ProgressBar,
  inputClass,
} from "@/components/ui";

function periodLength(type: PeriodType) {
  return type === "weekly" ? 7 : 14;
}

export default function CyclesPage() {
  const { userId, loading } = useAuth();
  const [periods, setPeriods] = useState<BudgetPeriod[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // form
  const [type, setType] = useState<PeriodType>("biweekly");
  const [amount, setAmount] = useState("");
  const [start, setStart] = useState(todayStr());
  const [saving, setSaving] = useState(false);

  async function reload() {
    const { data: p } = await supabase
      .from("budget_periods")
      .select("*")
      .order("start_date", { ascending: false });
    setPeriods((p as BudgetPeriod[]) ?? []);
  }

  useEffect(() => {
    if (!userId) return;
    (async () => {
      await reload();
      const { data: t } = await supabase.from("transactions").select("*");
      setTxns((t as Transaction[]) ?? []);
    })();
  }, [userId]);

  const active = useMemo(
    () => periods.find((p) => p.status === "active") ?? null,
    [periods]
  );
  const history = useMemo(
    () => periods.filter((p) => p.id !== active?.id),
    [periods, active]
  );

  const computedEnd = toDateStr(
    addDays(new Date(`${start}T00:00:00`), periodLength(type) - 1)
  );

  function spentIn(p: BudgetPeriod) {
    return sumByType(txns, "expense", p.start_date, p.end_date);
  }

  async function createBudget(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0 || !userId) return;
    setSaving(true);

    // Archive any currently-active period(s) → they become history.
    await supabase
      .from("budget_periods")
      .update({ status: "archived" })
      .eq("user_id", userId)
      .eq("status", "active");

    await supabase.from("budget_periods").insert({
      user_id: userId,
      period_type: type,
      amount: amt,
      start_date: start,
      end_date: computedEnd,
      status: "active",
    });

    await reload();
    setAmount("");
    setStart(todayStr());
    setSaving(false);
  }

  async function removePeriod(id: string) {
    setPeriods((p) => p.filter((x) => x.id !== id));
    await supabase.from("budget_periods").delete().eq("id", id);
  }

  if (loading) return null;

  return (
    <div>
      <PageHeader title="Budget Cycles" />
      <p className="mb-6 text-sm text-slate-400">
        Set a budget for each weekly or bi-weekly cycle. When you start a new
        one, the previous cycle moves to your history so you can look back and
        analyze your spending.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Current cycle */}
        <Card>
          <h2 className="mb-4 font-medium">Current Cycle</h2>
          {!active ? (
            <p className="text-sm text-slate-400">
              No active budget yet. Set one on the right to get started.
            </p>
          ) : (
            (() => {
              const spent = spentIn(active);
              const remaining = active.amount - spent;
              return (
                <div>
                  <p className="text-sm capitalize text-slate-400">
                    {active.period_type} ·{" "}
                    {shortDate(active.start_date)} – {shortDate(active.end_date)}
                  </p>
                  <p className="mt-2 text-3xl font-semibold">
                    {peso(remaining)}{" "}
                    <span className="text-base font-normal text-slate-400">
                      remaining
                    </span>
                  </p>
                  <div className="mt-4">
                    <ProgressBar
                      label="Spent"
                      current={spent}
                      total={active.amount}
                      invert
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Budget {peso(active.amount)} · Spent {peso(spent)}
                  </p>
                </div>
              );
            })()
          )}
        </Card>

        {/* New cycle form */}
        <Card>
          <h2 className="mb-4 font-medium">Set New Budget</h2>
          <form onSubmit={createBudget} className="space-y-3">
            <Field label="Cycle length">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as PeriodType)}
                className={inputClass}
              >
                <option value="biweekly">Bi-weekly (14 days)</option>
                <option value="weekly">Weekly (7 days)</option>
              </select>
            </Field>
            <Field label="Budget amount (₱)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Start date">
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className={inputClass}
              />
            </Field>
            <p className="text-xs text-slate-400">
              Cycle runs {shortDate(start)} → {shortDate(computedEnd)}.
              {active
                ? " Your current cycle will move to history."
                : ""}
            </p>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Start this budget"}
            </button>
          </form>
        </Card>
      </div>

      {/* History */}
      <Card className="mt-6">
        <h2 className="mb-4 font-medium">Budget History</h2>
        {history.length === 0 ? (
          <p className="text-sm text-slate-400">
            No past cycles yet. Once you start a new budget, your previous one
            appears here.
          </p>
        ) : (
          <ul className="space-y-3">
            {history.map((p) => {
              const spent = spentIn(p);
              const over = spent > p.amount;
              const open = expandedId === p.id;
              const cats = open
                ? expensesByCategory(txns, p.start_date, p.end_date)
                : [];
              return (
                <li
                  key={p.id}
                  className="rounded-xl border border-white/10 bg-black/10 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium capitalize">
                        {p.period_type} cycle
                      </p>
                      <p className="text-xs text-slate-400">
                        {shortDate(p.start_date)} – {shortDate(p.end_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-slate-400">
                        {peso(spent)} / {peso(p.amount)}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs ${
                          over
                            ? "bg-rose-500/20 text-rose-300"
                            : "bg-emerald-500/20 text-emerald-300"
                        }`}
                      >
                        {over
                          ? `Over by ${peso(spent - p.amount)}`
                          : `Under by ${peso(p.amount - spent)}`}
                      </span>
                      <button
                        onClick={() => setExpandedId(open ? null : p.id)}
                        className="text-indigo-300 hover:underline"
                      >
                        {open ? "Hide" : "Analyze"}
                      </button>
                      <button
                        onClick={() => removePeriod(p.id)}
                        className="text-slate-400 hover:text-rose-400"
                        aria-label="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="mt-3">
                    <ProgressBar
                      label="Spending vs budget"
                      current={spent}
                      total={p.amount}
                      invert
                    />
                  </div>

                  {open && (
                    <div className="mt-4 border-t border-white/10 pt-3">
                      <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                        Where it went
                      </p>
                      {cats.length === 0 ? (
                        <p className="text-sm text-slate-400">
                          No expenses recorded in this cycle.
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {cats.map((c, i) => {
                            const p2 =
                              spent > 0 ? (c.total / spent) * 100 : 0;
                            return (
                              <li key={c.category}>
                                <div className="flex justify-between text-sm">
                                  <span>{c.category}</span>
                                  <span className="text-slate-400">
                                    {peso(c.total)} · {pct(p2)}
                                  </span>
                                </div>
                                <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${p2}%`,
                                      backgroundColor: colorFor(i),
                                    }}
                                  />
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
