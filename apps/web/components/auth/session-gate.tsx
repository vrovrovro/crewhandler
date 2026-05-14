"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase-browser";
import { invalidateAuthState, peekAuthState, resolveAuthState } from "../../lib/auth-state";

export function SessionGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(() => peekAuthState()?.kind === "complete");

  useEffect(() => {
    const check = async () => {
      const authState = await resolveAuthState();

      if (authState.kind === "guest") {
        router.replace("/login");
        return;
      }

      if (authState.kind === "incomplete") {
        router.replace("/setup");
        return;
      }

      if (
        authState.role === "USER" &&
        pathname &&
        !pathname.startsWith("/interventions") &&
        !pathname.startsWith("/workspaces") &&
        !pathname.startsWith("/settings")
      ) {
        router.replace("/interventions");
        return;
      }

      setReady(true);
    };

    check();

    const { data: authListener } = supabaseBrowser.auth.onAuthStateChange(() => {
      invalidateAuthState();
      check();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading session...</div>;
  }

  return <>{children}</>;
}
