// Currency is Philippine Peso. Change "PHP" / "en-PH" here to localize.
const pesoFmt = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
});

export function peso(n: number) {
  return pesoFmt.format(Number.isFinite(n) ? n : 0);
}

export function pct(n: number) {
  return `${Math.round(n)}%`;
}

export function shortDate(dateStr: string) {
  // dateStr is YYYY-MM-DD; append time to avoid timezone day-shift.
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function monthLabel(year: number, monthIndex: number) {
  return new Date(year, monthIndex, 1).toLocaleDateString("en-PH", {
    month: "short",
  });
}
