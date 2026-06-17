"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase, type Transaction, type TxnType } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import {
  EXPENSE_CATEGORIES,
  INCOME_SOURCES,
  PAYMENT_METHODS,
  RECURRENCE_OPTIONS,
} from "@/lib/constants";
import { peso, shortDate } from "@/lib/format";
import { todayStr } from "@/lib/finance";
import { Card, Field, PageHeader, inputClass } from "@/components/ui";

type FormState = {
  type: TxnType;
  amount: string;
  category: string;
  payment_method: string;
  description: string;
  notes: string;
  txn_date: string;
  recurrence: string;
};

function emptyForm(type: TxnType = "expense"): FormState {
  return {
    type,
    amount: "",
    category: type === "expense" ? EXPENSE_CATEGORIES[0] : INCOME_SOURCES[0],
    payment_method: PAYMENT_METHODS[0],
    description: "",
    notes: "",
    txn_date: todayStr(),
    recurrence: "none",
  };
}

export default function TransactionsPage() {
  const { userId, loading } = useAuth();
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // filters
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | TxnType>("all");
  const [catFilter, setCatFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("transactions")
      .select("*")
      .order("txn_date", { ascending: false })
      .order("created_at", { ascending: false })
      .then(({ data }) => setTxns((data as Transaction[]) ?? []));
  }, [userId]);

  const categoriesInUse = useMemo(() => {
    const set = new Set(txns.map((t) => t.category));
    return Array.from(set).sort();
  }, [txns]);

  const filtered = useMemo(() => {
    return txns.filter((t) => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (catFilter !== "all" && t.category !== catFilter) return false;
      if (from && t.txn_date < from) return false;
      if (to && t.txn_date > to) return false;
      if (q) {
        const hay =
          `${t.description ?? ""} ${t.notes ?? ""} ${t.category}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [txns, typeFilter, catFilter, from, to, q]);

  function openAdd(type: TxnType) {
    setForm(emptyForm(type));
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(t: Transaction) {
    setForm({
      type: t.type,
      amount: String(t.amount),
      category: t.category,
      payment_method: t.payment_method ?? PAYMENT_METHODS[0],
      description: t.description ?? "",
      notes: t.notes ?? "",
      txn_date: t.txn_date,
      recurrence: t.recurrence,
    });
    setEditingId(t.id);
    setShowForm(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!amount || amount <= 0 || !userId) return;
    setSaving(true);

    const payload = {
      user_id: userId,
      type: form.type,
      amount,
      category: form.category,
      payment_method: form.payment_method,
      description: form.description.trim() || null,
      notes: form.notes.trim() || null,
      txn_date: form.txn_date,
      recurrence: form.recurrence,
    };

    if (editingId) {
      const { data } = await supabase
        .from("transactions")
        .update(payload)
        .eq("id", editingId)
        .select()
        .single();
      if (data)
        setTxns((p) =>
          p.map((t) => (t.id === editingId ? (data as Transaction) : t))
        );
    } else {
      const { data } = await supabase
        .from("transactions")
        .insert(payload)
        .select()
        .single();
      if (data) setTxns((p) => [data as Transaction, ...p]);
    }

    setSaving(false);
    setShowForm(false);
    setEditingId(null);
  }

  async function remove(id: string) {
    setTxns((p) => p.filter((t) => t.id !== id));
    await supabase.from("transactions").delete().eq("id", id);
  }

  if (loading) return null;

  const catOptions =
    form.type === "expense" ? EXPENSE_CATEGORIES : INCOME_SOURCES;

  return (
    <div>
      <PageHeader title="Transactions">
        <div className="flex gap-2">
          <button
            onClick={() => openAdd("income")}
            className="rounded-lg bg-emerald-500/90 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-400"
          >
            + Income
          </button>
          <button
            onClick={() => openAdd("expense")}
            className="rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-400"
          >
            + Expense
          </button>
        </div>
      </PageHeader>

      {/* Filters */}
      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Search">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Description, notes…"
              className={inputClass}
            />
          </Field>
          <Field label="Type">
            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value as "all" | TxnType)
              }
              className={inputClass}
            >
              <option value="all">All</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </Field>
          <Field label="Category">
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className={inputClass}
            >
              <option value="all">All</option>
              {categoriesInUse.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="From">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="To">
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      </Card>

      {/* List */}
      <Card>
        <p className="mb-3 text-sm text-slate-400">
          {filtered.length} transaction{filtered.length === 1 ? "" : "s"}
        </p>
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            No transactions match. Add one with the buttons above.
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {filtered.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {t.description || t.category}
                  </p>
                  <p className="text-xs text-slate-400">
                    {t.category} · {shortDate(t.txn_date)}
                    {t.payment_method ? ` · ${t.payment_method}` : ""}
                    {t.recurrence !== "none" ? ` · ↻ ${t.recurrence}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`font-semibold ${
                      t.type === "income" ? "text-emerald-300" : "text-rose-300"
                    }`}
                  >
                    {t.type === "income" ? "+" : "−"}
                    {peso(Number(t.amount))}
                  </span>
                  <button
                    onClick={() => openEdit(t)}
                    className="text-slate-400 hover:text-indigo-300"
                    aria-label="Edit"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => remove(t.id)}
                    className="text-slate-400 hover:text-rose-400"
                    aria-label="Delete"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Add/Edit modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowForm(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-semibold">
              {editingId ? "Edit" : "Add"}{" "}
              {form.type === "income" ? "income" : "expense"}
            </h2>
            <form onSubmit={save} className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <select
                  value={form.type}
                  onChange={(e) => {
                    const type = e.target.value as TxnType;
                    setForm((f) => ({
                      ...f,
                      type,
                      category:
                        type === "expense"
                          ? EXPENSE_CATEGORIES[0]
                          : INCOME_SOURCES[0],
                    }));
                  }}
                  className={inputClass}
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </Field>
              <Field label="Amount (₱)">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, amount: e.target.value }))
                  }
                  className={inputClass}
                  autoFocus
                />
              </Field>
              <Field
                label={form.type === "expense" ? "Category" : "Source"}
              >
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                  className={inputClass}
                >
                  {catOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Payment method">
                <select
                  value={form.payment_method}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, payment_method: e.target.value }))
                  }
                  className={inputClass}
                >
                  {PAYMENT_METHODS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Date">
                <input
                  type="date"
                  value={form.txn_date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, txn_date: e.target.value }))
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Recurring">
                <select
                  value={form.recurrence}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, recurrence: e.target.value }))
                  }
                  className={inputClass}
                >
                  {RECURRENCE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="col-span-2">
                <Field label="Description">
                  <input
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    className={inputClass}
                    placeholder="e.g. Lunch at Jollibee"
                  />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Notes">
                  <input
                    value={form.notes}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, notes: e.target.value }))
                    }
                    className={inputClass}
                  />
                </Field>
              </div>
              <div className="col-span-2 mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
