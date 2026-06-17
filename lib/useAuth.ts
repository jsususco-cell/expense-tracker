"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./supabase";

export type AuthState = {
  userId: string | null;
  email: string | null;
  loading: boolean;
};

// Guards a page: redirects to /login if there's no session.
export function useAuth(): AuthState {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    userId: null,
    email: null,
    loading: true,
  });

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const session = data.session;
      if (!session) {
        router.replace("/login");
        return;
      }
      setState({
        userId: session.user.id,
        email: session.user.email ?? null,
        loading: false,
      });
    });
    return () => {
      active = false;
    };
  }, [router]);

  return state;
}
