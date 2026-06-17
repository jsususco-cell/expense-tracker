"use client";

import { useEffect, useState } from "react";
import { supabase, type SavingsGoal } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import { peso, pct, shortDate } from "@/lib/format";
import { Card, Field, PageHeader, inputClass } from "@/components/ui";

export default function GoalsPage() {
  const { userId, loading } = useAuth();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("savings_goals")
      .select("*")
      .order("created_at")
      .then(({ data }) => setGoals((data as SavingsGoal[]) ?? []));
  }, [userId]);

  async function addGoal(e: React.FormEvent) {
    e.preventDefault();
    const t = Number(target);
    if (!name.trim() || !t || t <= 0 || !userId) return;
    const { data } = await supabase
      .from("savings_goals")
      .insert({
        user_id: userId,
        name: name.trim(),
        target_amount: t,
        current_amount: Number(current) || 0,
        target_date: date || null,
      })
      .select()
      .single();
    if (data) {
      setGoals((p) => [...p, data as SavingsGoal]);
      setName("");
      setTarget("");
      setCurrent("");
      setDate("");
    }
  }

  async function addContribution(goal: SavingsGoal, amount: number) {
    const next = Math.max(0, Number(goal.current_amount) + amount);
    setGoals((p) =>
      p.map((g) => (g.id === goal.id ? { ...g, current_amount: next } : g))
    );
    await supabase
      .from("savings_goals")
      .update({ current_amount: next })
      .eq("id", goal.id);
  }

  async function remove(id: string) {
    setGoals((p) => p.filter((g) => g.id !== id));
    await supabase.from("savings_goals").delete().eq("id", id);
  }

  if (loading) return null;

  return (
    <div>
      <PageHeader title="Savings Goals" />

      <Card className="mb-6">
        <h2 className="mb-4 font-medium">New goal</h2>
        <form
          onSubmit={addGoal}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <Field label="Goal name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Emergency Fund"
              className={inputClass}
            />
          </Field>
          <Field label="Target amount (₱)">
            <input
              type="number"
              min="0"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Starting amount (₱)">
            <input
              type="number"
              min="0"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Target date">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </Field>
          <div className="sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
            >
              Add goal
            </button>
          </div>
        </form>
      </Card>

      {goals.length === 0 ? (
        <Card>
          <p className="py-6 text-center text-sm text-slate-400">
            No goals yet. Create one above to start tracking your savings.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {goals.map((g) => {
            const ratio =
              g.target_amount > 0
                ? Number(g.current_amount) / Number(g.target_amount)
                : 0;
            const remaining = Math.max(
              Number(g.target_amount) - Number(g.current_amount),
              0
            );
            const done = ratio >= 1;
            return (
              <Card key={g.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">{g.name}</h3>
                    {g.target_date && (
                      <p className="text-xs text-slate-400">
                        by {shortDate(g.target_date)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => remove(g.id)}
                    className="text-slate-400 hover:text-rose-400"
                    aria-label="Delete goal"
                  >
                    ✕
                  </button>
                </div>

                <p className="mt-3 text-2xl font-semibold">
                  {peso(Number(g.current_amount))}
                  <span className="text-base font-normal text-slate-400">
                    {" "}
                    / {peso(Number(g.target_amount))}
                  </span>
                </p>

                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full ${
                      done ? "bg-emerald-400" : "bg-indigo-400"
                    }`}
                    style={{ width: `${Math.min(ratio, 1) * 100}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  {pct(ratio * 100)} ·{" "}
                  {done ? "Goal reached 🎉" : `${peso(remaining)} to go`}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {[100, 500, 1000].map((a) => (
                    <button
                      key={a}
                      onClick={() => addContribution(g, a)}
                      className="rounded-lg border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5"
                    >
                      +{peso(a)}
                    </button>
                  ))}
                  <button
                    onClick={() => addContribution(g, -100)}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:bg-white/5"
                  >
                    −{peso(100)}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
