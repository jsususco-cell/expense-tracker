"use client";

import { peso, pct } from "@/lib/format";

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/5 p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  tone = "default",
  sub,
}: {
  label: string;
  value: string;
  tone?: "default" | "positive" | "negative";
  sub?: string;
}) {
  const color =
    tone === "positive"
      ? "text-emerald-300"
      : tone === "negative"
        ? "text-rose-300"
        : "text-slate-100";
  return (
    <Card>
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${color}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </Card>
  );
}

// A labelled progress bar (used for budgets and goals).
export function ProgressBar({
  label,
  current,
  total,
  invert = false,
}: {
  label: string;
  current: number;
  total: number;
  // invert=true → over budget is bad (red). For savings goals leave false (green).
  invert?: boolean;
}) {
  const ratio = total > 0 ? current / total : 0;
  const clamped = Math.min(ratio, 1) * 100;
  const over = ratio > 1;

  let barColor = "bg-indigo-400";
  if (invert) {
    barColor = over
      ? "bg-rose-400"
      : ratio > 0.8
        ? "bg-amber-400"
        : "bg-emerald-400";
  } else {
    barColor = ratio >= 1 ? "bg-emerald-400" : "bg-indigo-400";
  }

  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-200">{label}</span>
        <span className={over && invert ? "text-rose-300" : "text-slate-400"}>
          {peso(current)} / {peso(total)} · {pct(ratio * 100)}
        </span>
      </div>
      <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${barColor} transition-all`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

// Simple responsive vertical bar chart (pure SVG, no deps).
export function BarChart({
  data,
  height = 160,
  color = "#818cf8",
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}) {
  const max = Math.max(1, ...data.map((d) => Math.abs(d.value)));
  const barW = 100 / Math.max(data.length, 1);

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
      >
        {data.map((d, i) => {
          const h = (Math.abs(d.value) / max) * (height - 24);
          const x = i * barW;
          const negative = d.value < 0;
          return (
            <rect
              key={i}
              x={x + barW * 0.18}
              y={height - 16 - h}
              width={barW * 0.64}
              height={Math.max(h, d.value !== 0 ? 1 : 0)}
              rx={1.2}
              fill={negative ? "#f87171" : color}
            />
          );
        })}
      </svg>
      <div className="flex">
        {data.map((d, i) => (
          <div
            key={i}
            className="text-center text-[10px] text-slate-400"
            style={{ width: `${barW}%` }}
          >
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-slate-400">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-indigo-400";

export function PageHeader({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {children}
    </header>
  );
}
