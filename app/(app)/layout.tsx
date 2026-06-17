"use client";

import Nav from "@/components/Nav";
import { useAuth } from "@/lib/useAuth";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { email, loading } = useAuth();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-slate-400">Loading…</p>
      </main>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row">
      <Nav email={email} />
      <main className="flex-1 px-4 py-6 lg:h-screen lg:overflow-y-auto lg:px-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
