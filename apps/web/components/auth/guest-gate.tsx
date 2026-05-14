"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { supabaseBrowser } from "../../lib/supabase-browser";
import { invalidateAuthState, peekAuthState, resolveAuthState } from "../../lib/auth-state";

export function GuestGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isSetupRoute = pathname?.startsWith("/setup");
  const isInviteRoute = pathname?.startsWith("/invite");
  const [ready, setReady] = useState(() => {
    if (isInviteRoute) return true;
    const cached = peekAuthState();
    return isSetupRoute ? cached?.kind === "incomplete" || cached?.kind === "guest" : cached?.kind === "guest";
  });

  useEffect(() => {
    const check = async () => {
      const authState = await resolveAuthState();

      if (isInviteRoute) {
        setReady(true);
        return;
      }

      if (authState.kind === "guest") {
        if (isSetupRoute) {
          router.replace("/login");
          return;
        }
        setReady(true);
        return;
      }

      if (authState.kind === "incomplete" && (isSetupRoute || isInviteRoute)) {
        setReady(true);
        return;
      }

      if (authState.kind === "complete") {
        router.replace(authState.role === "USER" ? "/interventions" : "/dashboard");
        return;
      }

      router.replace(isInviteRoute ? "/invite" : "/setup");
    };

    check();

    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange(() => {
      invalidateAuthState();
      check();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isInviteRoute, isSetupRoute, router]);

  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading...</div>;
  }

  return <>{children}</>;
}
