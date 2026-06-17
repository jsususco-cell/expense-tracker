"use client";

import { peso, pct } from "@/lib/format";
import type { Allocation } from "@/lib/finance";
import { Card } from "./ui";

export default function AllocationCard({
  allocation,
  goalLines = [],
  compact = false,
}: {
  allocation: Allocation;
  goalLines?: { name: string; amount: number }[];
  compact?: boolean;
}) {
  const { income, limit, goalContrib, leftover, overAllocated, overBy } =
    allocation;

  // Bar segments (as % of income; if over-allocated, scale to allocated total).
  const denom = Math.max(income, allocation.allocated, 1);
  const limitPct = (limit / denom) * 100;
  const goalPct = (goalContrib / denom) * 100;
  const leftPct = Math.max(0, (leftover / denom) * 100);

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium">Allocation Overview</h2>
        {overAllocated ? (
          <span className="rounded-full bg-rose-500/20 px-2.5 py-1 text-xs text-rose-300">
            Over-allocated by {peso(overBy)}
          </span>
        ) : (
          <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs text-emerald-300">
            Balanced
          </span>
        )}
      </div>

      <p className="text-sm text-slate-400">
        Expected monthly income
        {allocation.usedActualIncome ? " (from this month's actual)" : ""}
      </p>
      <p className="text-2xl font-semibold">{peso(income)}</p>

      {/* stacked bar: spending limit + goals + leftover */}
      <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-rose-400/80"
          style={{ width: `${limitPct}%` }}
          title="Spending limit"
        />
        <div
          className="h-full bg-amber-400/80"
          style={{ width: `${goalPct}%` }}
          title="Savings goals"
        />
        <div
          className="h-full bg-emerald-400/70"
          style={{ width: `${leftPct}%` }}
          title="Leftover"
        />
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <Row color="bg-rose-400/80" label="Monthly spending limit" value={peso(limit)} />
        <Row
          color="bg-amber-400/80"
          label="Savings goal contributions"
          value={peso(goalContrib)}
        />
        <div className="my-2 border-t border-white/10" />
        <div className="flex items-center justify-between font-medium">
          <dt className={overAllocated ? "text-rose-300" : "text-emerald-300"}>
            {overAllocated ? "Over income by" : "Leftover (unallocated)"}
          </dt>
          <dd className={overAllocated ? "text-rose-300" : "text-emerald-300"}>
            {overAllocated ? peso(overBy) : peso(leftover)}
          </dd>
        </div>
        {income > 0 && (
          <p className="text-xs text-slate-400">
            {pct((allocation.allocated / income) * 100)} of income allocated
          </p>
        )}
      </dl>

      {!compact && goalLines.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
            Goal contributions / month
          </p>
          <ul className="space-y-1 text-sm">
            {goalLines.map((g) => (
              <li key={g.name} className="flex justify-between">
                <span className="text-slate-300">{g.name}</span>
                <span className="text-slate-400">
                  {g.amount > 0 ? peso(g.amount) : "— (no deadline)"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {overAllocated && (
        <p className="mt-3 text-xs text-rose-300/90">
          Your spending limit plus goal contributions exceed your income. Lower
          a limit, extend a goal deadline, or increase expected income.
        </p>
      )}
    </Card>
  );
}

function Row({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="flex items-center gap-2 text-slate-300">
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />
        {label}
      </dt>
      <dd className="text-slate-200">{value}</dd>
    </div>
  );
}
