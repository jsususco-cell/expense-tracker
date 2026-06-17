"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/transactions", label: "Transactions", icon: "💸" },
  { href: "/budgets", label: "Budgets", icon: "🎯" },
  { href: "/cycles", label: "Budget Cycles", icon: "🔄" },
  { href: "/goals", label: "Goals", icon: "🏆" },
  { href: "/reports", label: "Reports", icon: "📈" },
  { href: "/help", label: "Help & Guide", icon: "❓" },
];

export default function Nav({ email }: { email: string | null }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <aside className="flex flex-col gap-1 border-b border-white/10 bg-black/20 p-3 lg:h-screen lg:w-60 lg:border-b-0 lg:border-r">
      <div className="px-2 py-3">
        <p className="text-lg font-semibold">₱ Budget</p>
        <p className="truncate text-xs text-slate-400">{email}</p>
      </div>

      <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        {LINKS.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? "bg-indigo-500/20 text-indigo-200"
                  : "text-slate-300 hover:bg-white/5"
              }`}
            >
              <span>{l.icon}</span>
              {l.label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={signOut}
        className="mt-auto hidden rounded-lg border border-white/10 px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/5 lg:block"
      >
        Sign out
      </button>
    </aside>
  );
}
