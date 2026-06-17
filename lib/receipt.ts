// Parses raw OCR text from a receipt into structured fields.
// Best-effort — the user always confirms before saving.

export type ParsedReceipt = {
  amount: number | null;
  date: string | null; // YYYY-MM-DD
  merchant: string | null;
};

// Matches money like 1,234.56 / 1234.56 / 123.00, optionally prefixed by ₱/P/PHP.
const AMOUNT_RE =
  /(?:php|₱|p)?\s*([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2}|[0-9]+\.[0-9]{2})/gi;

function toNumber(token: string): number {
  return parseFloat(token.replace(/,/g, ""));
}

function amountsIn(line: string): number[] {
  return [...line.matchAll(AMOUNT_RE)].map((m) => toNumber(m[1]));
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function parseDate(text: string): string | null {
  // ISO: 2026-06-18
  let m = text.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;

  // Month name: Jun 18, 2026 / June 18 2026
  m = text.match(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(20\d{2})\b/);
  if (m) {
    const mo = MONTHS[m[1].slice(0, 3).toLowerCase()];
    if (mo) return `${m[3]}-${pad(mo)}-${pad(+m[2])}`;
  }

  // Numeric with 4-digit year: 06/18/2026 or 18/06/2026 (assume MM/DD/YYYY,
  // fall back to DD/MM if first part > 12).
  m = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](20\d{2})\b/);
  if (m) {
    let mo = +m[1];
    let day = +m[2];
    if (mo > 12 && day <= 12) [mo, day] = [day, mo];
    if (mo >= 1 && mo <= 12 && day >= 1 && day <= 31) {
      return `${m[3]}-${pad(mo)}-${pad(day)}`;
    }
  }
  return null;
}

export function parseReceiptText(raw: string): ParsedReceipt {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // --- amount: prefer lines mentioning a grand total ---
  const totalLines = lines.filter(
    (l) =>
      /\b(grand\s*total|total\s*due|amount\s*due|amount\s*paid|balance\s*due|total)\b/i.test(
        l
      ) && !/sub\s*-?\s*total/i.test(l)
  );

  let amount: number | null = null;
  const totalCandidates = totalLines.flatMap(amountsIn);
  if (totalCandidates.length) {
    amount = Math.max(...totalCandidates);
  } else {
    // fallback: the largest money value anywhere on the receipt
    const all = lines.flatMap(amountsIn);
    if (all.length) amount = Math.max(...all);
  }

  const date = parseDate(raw);

  // --- merchant: first line that looks like a name (letters, not a total) ---
  const merchant =
    lines.find(
      (l) =>
        /[A-Za-z]{3,}/.test(l) &&
        !/total|receipt|invoice|cash|change|tel|vat|tin/i.test(l) &&
        amountsIn(l).length === 0
    ) ?? null;

  return { amount, date, merchant };
}
