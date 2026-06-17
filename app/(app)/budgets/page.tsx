"use client";

import { useEffect, useMemo, useState } from "react";
import {
  supabase,
  type Transaction,
  type BudgetSettings,
  type CategoryBudget,
} from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { peso } from "@/lib/format";
import {
  sumByType,
  todayStr,
  toDateStr,
  startOfWeek,
  startOfMonth,
} from "@/lib/finance";
import {
  Card,
  Field,
  PageHeader,
  ProgressBar,
  inputClass,
} from "@/components/ui";

const BLANK: Omit<BudgetSettings, "user_id" | "updated_at"> = {
  daily_limit: 0,
  weekly_limit: 0,
  monthly_limit: 0,
  weekly_savings_target: 0,
  monthly_savings_target: 0,
};

export default function BudgetsPage() {
  const { userId, loading } = useAuth();
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState(BLANK);
  const [catBudgets, setCatBudgets] = useState<CategoryBudget[]>([]);
  const [savedMsg, setSavedMsg] = useState(false);

  // new category budget form
  const [newCat, setNewCat] = useState(EXPENSE_CATEGORIES[0]);
  const [newAmt, setNewAmt] = useState("");

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data: tx } = await supabase.from("transactions").select("*");
      setTxns((tx as Transaction[]) ?? []);

      const { data: s } = await supabase
        .from("budget_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (s) {
        const { user_id, updated_at, ...rest } = s as BudgetSettings;
        void user_id;
        void updated_at;
        setSettings(rest);
      }

      const { data: cb } = await supabase
        .from("category_budgets")
        .select("*")
        .order("created_at");
      setCatBudgets((cb as CategoryBudget[]) ?? []);
    })();
  }, [userId]);

  // spending in each window
  const today = todayStr();
  const weekStart = toDateStr(startOfWeek());
  const monthStart = toDateStr(startOfMonth());

  const spentToday = sumByType(txns, "expense", today, today);
  const spentWeek = sumByType(txns, "expense", weekStart, today);
  const spentMonth = sumByType(txns, "expense", monthStart, today);
  const savedWeek = useMemo(
    () =>
      sumByType(txns, "income", weekStart, today) -
      sumByType(txns, "expense", weekStart, today),
    [txns, weekStart, today]
  );
  const savedMonth = useMemo(
    () =>
      sumByType(txns, "income", monthStart, today) -
      sumByType(txns, "expense", monthStart, today),
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

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    await supabase.from("budget_settings").upsert({
      user_id: userId,
      ...settings,
      updated_at: new Date().toISOString(),
    });
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  }

  async function addCatBudget(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(newAmt);
    if (!amt || amt <= 0 || !userId) return;
    const { data } = await supabase
      .from("category_budgets")
      .upsert(
        { user_id: userId, category: newCat, monthly_amount: amt },
        { onConflict: "user_id,category" }
      )
      .select()
      .single();
    if (data) {
      setCatBudgets((p) => {
        const others = p.filter((c) => c.category !== newCat);
        return [...others, data as CategoryBudget];
      });
      setNewAmt("");
    }
  }

  async function removeCatBudget(id: string) {
    setCatBudgets((p) => p.filter((c) => c.id !== id));
    await supabase.from("category_budgets").delete().eq("id", id);
  }

  function num(v: string) {
    return Number(v) || 0;
  }

  if (loading) return null;

  return (
    <div>
      <PageHeader title="Budgets" />

      {/* Spending vs limits */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="mb-3 font-medium">Daily</h2>
          <ProgressBar
            label="Spent today"
            current={spentToday}
            total={settings.daily_limit}
            invert
          />
          <p className="mt-2 text-xs text-slate-400">
            Remaining: {peso(Math.max(settings.daily_limit - spentToday, 0))}
          </p>
        </Card>
        <Card>
          <h2 className="mb-3 font-medium">Weekly</h2>
          <ProgressBar
            label="Spent this week"
            current={spentWeek}
            total={settings.weekly_limit}
            invert
          />
          <div className="mt-3">
            <ProgressBar
              label="Saved this week"
              current={Math.max(savedWeek, 0)}
              total={settings.weekly_savings_target}
            />
          </div>
        </Card>
        <Card>
          <h2 className="mb-3 font-medium">Monthly</h2>
          <ProgressBar
            label="Spent this month"
            current={spentMonth}
            total={settings.monthly_limit}
            invert
          />
          <div className="mt-3">
            <ProgressBar
              label="Saved this month"
              current={Math.max(savedMonth, 0)}
              total={settings.monthly_savings_target}
            />
          </div>
        </Card>
      </div>

      {/* Set limits */}
      <Card className="mt-6">
        <h2 className="mb-4 font-medium">Set budget limits &amp; savings targets</h2>
        <form
          onSubmit={saveSettings}
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
        >
          <Field label="Daily limit (₱)">
            <input
              type="number"
              min="0"
              value={settings.daily_limit || ""}
              onChange={(e) =>
                setSettings((s) => ({ ...s, daily_limit: num(e.target.value) }))
              }
              className={inputClass}
            />
          </Field>
          <Field label="Weekly limit (₱)">
            <input
              type="number"
              min="0"
              value={settings.weekly_limit || ""}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  weekly_limit: num(e.target.value),
                }))
              }
              className={inputClass}
            />
          </Field>
          <Field label="Monthly limit (₱)">
            <input
              type="number"
              min="0"
              value={settings.monthly_limit || ""}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  monthly_limit: num(e.target.value),
                }))
              }
              className={inputClass}
            />
          </Field>
          <Field label="Weekly savings (₱)">
            <input
              type="number"
              min="0"
              value={settings.weekly_savings_target || ""}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  weekly_savings_target: num(e.target.value),
                }))
              }
              className={inputClass}
            />
          </Field>
          <Field label="Monthly savings (₱)">
            <input
              type="number"
              min="0"
              value={settings.monthly_savings_target || ""}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  monthly_savings_target: num(e.target.value),
                }))
              }
              className={inputClass}
            />
          </Field>
          <div className="col-span-2 flex items-center gap-3 sm:col-span-3 lg:col-span-5">
            <button
              type="submit"
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
            >
              Save limits
            </button>
            {savedMsg && (
              <span className="text-sm text-emerald-400">Saved ✓</span>
            )}
          </div>
        </form>
      </Card>

      {/* Category budgets */}
      <Card className="mt-6">
        <h2 className="mb-4 font-medium">Category budgets (monthly)</h2>

        <form
          onSubmit={addCatBudget}
          className="mb-5 flex flex-wrap items-end gap-3"
        >
          <Field label="Category">
            <select
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              className={inputClass}
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Monthly amount (₱)">
            <input
              type="number"
              min="0"
              value={newAmt}
              onChange={(e) => setNewAmt(e.target.value)}
              className={inputClass}
            />
          </Field>
          <button
            type="submit"
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
          >
            Set
          </button>
        </form>

        {catBudgets.length === 0 ? (
          <p className="text-sm text-slate-400">
            No category budgets yet. Add one above to track spending per
            category.
          </p>
        ) : (
          <div className="space-y-4">
            {catBudgets.map((cb) => (
              <div key={cb.id} className="flex items-center gap-3">
                <div className="flex-1">
                  <ProgressBar
                    label={cb.category}
                    current={monthSpendByCat.get(cb.category) ?? 0}
                    total={cb.monthly_amount}
                    invert
                  />
                </div>
                <button
                  onClick={() => removeCatBudget(cb.id)}
                  className="text-slate-400 hover:text-rose-400"
                  aria-label="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
