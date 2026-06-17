import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and " +
      "NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (see .env.local.example)."
  );
}

export const supabase = createClient(url, anonKey);

export type TxnType = "income" | "expense";
export type Recurrence =
  | "none"
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly";

export type Transaction = {
  id: string;
  user_id: string;
  type: TxnType;
  amount: number;
  category: string;
  payment_method: string | null;
  description: string | null;
  notes: string | null;
  txn_date: string; // YYYY-MM-DD
  recurrence: Recurrence;
  created_at: string;
};

export type BudgetSettings = {
  user_id: string;
  daily_limit: number;
  weekly_limit: number;
  monthly_limit: number;
  weekly_savings_target: number;
  monthly_savings_target: number;
  expected_monthly_income: number;
  updated_at: string;
};

export type CategoryBudget = {
  id: string;
  user_id: string;
  category: string;
  monthly_amount: number;
  created_at: string;
};

export type SavingsGoal = {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  created_at: string;
};
