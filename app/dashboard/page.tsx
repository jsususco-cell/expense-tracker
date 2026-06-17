"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, type Expense } from "@/lib/supabase";

const CATEGORIES = [
  "General",
  "Housing",
  "Food",
  "Transport",
  "Utilities",
  "Health",
  "Entertainment",
  "Savings",
  "Other",
];

function currency(n: number) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  const [startingBalance, setStartingBalance] = useState(0);
  const [balanceInput, setBalanceInput] = useState("0");
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [saving, setSaving] = useState(false);

  // Load session + data.
  const load = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      router.replace("/login");
      return;
    }
    setEmail(session.user.email ?? null);

    // Ensure a budget row exists for this user.
    const { data: budget } = await supabase
      .from("budgets")
      .select("starting_balance")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (!budget) {
      await supabase
        .from("budgets")
        .insert({ user_id: session.user.id, starting_balance: 0 });
      setStartingBalance(0);
      setBalanceInput("0");
    } else {
      setStartingBalance(Number(budget.starting_balance));
      setBalanceInput(String(Number(budget.starting_balance)));
    }

    const { data: rows } = await supabase
      .from("expenses")
      .select("*")
      .order("created_at", { ascending: false });

    setExpenses((rows as Expense[]) ?? []);
    setReady(true);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, e) => sum + Number(e.amount), 0),
    [expenses]
  );
  const endingBalance = startingBalance - totalExpenses;

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount));
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  async function saveStartingBalance() {
    const value = Number(balanceInput) || 0;
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return;
    setStartingBalance(value);
    await supabase
      .from("budgets")
      .upsert({ user_id: userId, starting_balance: value, updated_at: new Date().toISOString() });
  }

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!name.trim() || !value || value <= 0) return;
    setSaving(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return;

    const { data, error } = await supabase
      .from("expenses")
      .insert({
        user_id: userId,
        name: name.trim(),
        amount: value,
        category,
      })
      .select()
      .single();

    if (!error && data) {
      setExpenses((prev) => [data as Expense, ...prev]);
      setName("");
      setAmount("");
      setCategory(CATEGORIES[0]);
    }
    setSaving(false);
  }

  async function deleteExpense(id: string) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    await supabase.from("expenses").delete().eq("id", id);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-slate-400">Loading your budget…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Budget Dashboard</h1>
          <p className="text-sm text-slate-400">{email}</p>
        </div>
        <button
          onClick={signOut}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
        >
          Sign out
        </button>
      </header>

      {/* Stat cards */}
      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-slate-400">Starting balance</p>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              step="0.01"
              value={balanceInput}
              onChange={(e) => setBalanceInput(e.target.value)}
              onBlur={saveStartingBalance}
              className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-2xl font-semibold outline-none focus:border-indigo-400"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-slate-400">Total expenses</p>
          <p className="mt-2 text-3xl font-semibold text-rose-300">
            {currency(totalExpenses)}
          </p>
        </div>

        <div
          className={`rounded-2xl border p-5 ${
            endingBalance >= 0
              ? "border-emerald-400/30 bg-emerald-400/10"
              : "border-rose-400/30 bg-rose-400/10"
          }`}
        >
          <p className="text-sm text-slate-400">Ending balance</p>
          <p
            className={`mt-2 text-3xl font-semibold ${
              endingBalance >= 0 ? "text-emerald-300" : "text-rose-300"
            }`}
          >
            {currency(endingBalance)}
          </p>
        </div>
      </section>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Add + list expenses */}
        <section className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="font-medium">Add an expense</h2>
            <form
              onSubmit={addExpense}
              className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px_160px_auto]"
            >
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Description"
                className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 outline-none focus:border-indigo-400"
              />
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount"
                className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 outline-none focus:border-indigo-400"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 outline-none focus:border-indigo-400"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-slate-800">
                    {c}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-indigo-500 px-4 py-2 font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
              >
                Add
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="font-medium">
              Expenses{" "}
              <span className="text-slate-400">({expenses.length})</span>
            </h2>
            {expenses.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">
                No expenses yet. Add your first one above.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-white/5">
                {expenses.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div>
                      <p className="font-medium">{e.name}</p>
                      <p className="text-xs text-slate-400">
                        {e.category} ·{" "}
                        {new Date(e.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold text-rose-300">
                        {currency(Number(e.amount))}
                      </span>
                      <button
                        onClick={() => deleteExpense(e.id)}
                        className="text-slate-400 hover:text-rose-400"
                        aria-label="Delete expense"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Category breakdown */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="font-medium">By category</h2>
          {byCategory.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">Nothing to show yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {byCategory.map(([cat, total]) => {
                const pct =
                  totalExpenses > 0 ? (total / totalExpenses) * 100 : 0;
                return (
                  <li key={cat}>
                    <div className="flex justify-between text-sm">
                      <span>{cat}</span>
                      <span className="text-slate-400">
                        {currency(total)} · {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-indigo-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
