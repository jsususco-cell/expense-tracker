export const EXPENSE_CATEGORIES = [
  "Food",
  "Transportation",
  "Bills",
  "Utilities",
  "Groceries",
  "Entertainment",
  "Healthcare",
  "Shopping",
  "Education",
  "Others",
];

export const INCOME_SOURCES = [
  "Salary",
  "Side Income",
  "Bonus",
  "Investment",
  "Gift",
  "Other",
];

export const PAYMENT_METHODS = [
  "Cash",
  "Card",
  "Bank Transfer",
  "E-Wallet",
  "Other",
];

export const RECURRENCE_OPTIONS = [
  { value: "none", label: "One-time" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
] as const;

// Colors used for category charts (cycled).
export const CATEGORY_COLORS = [
  "#818cf8",
  "#34d399",
  "#fbbf24",
  "#f472b6",
  "#60a5fa",
  "#a78bfa",
  "#fb923c",
  "#4ade80",
  "#f87171",
  "#22d3ee",
];

export function colorFor(index: number) {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}
