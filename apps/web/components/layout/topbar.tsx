"use client";

import { LogOut, Menu, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase-browser";
import { invalidateAuthState, resolveAuthState } from "../../lib/auth-state";
import { clearViewCache } from "../../lib/view-cache";
import { GlobalSearch } from "./global-search";

export function Topbar({
  onOpenSidebar,
}: {
  onOpenSidebar: () => void;
}) {
  const router = useRouter();
  const [email, setEmail] = useState<string>("Loading...");
  const [accountOpen, setAccountOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const syncUser = async () => {
      const authState = await resolveAuthState();
      setEmail(authState.email ?? "Signed in");
    };

    syncUser();

    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange(() => {
      invalidateAuthState();
      syncUser();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const signOut = async () => {
    await supabaseBrowser.auth.signOut();
    invalidateAuthState();
    clearViewCache();
    router.replace("/login");
    window.location.assign("/login");
  };

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 rounded-[24px] border border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-5 lg:justify-between">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-500 lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1 lg:min-w-[420px] lg:flex-none">
          <GlobalSearch />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <div className="hidden min-w-[180px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right text-slate-950 sm:block">
          <p className="max-w-48 truncate text-sm font-medium">{email}</p>
          <button onClick={signOut} className="mt-1 inline-flex items-center gap-2 text-xs text-slate-500">
            <LogOut className="h-3 w-3" />
            Sign out
          </button>
        </div>
        <div ref={accountMenuRef} className="relative sm:hidden">
          <button
            type="button"
            onClick={() => setAccountOpen((value) => !value)}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 text-slate-600"
          >
            <UserRound className="h-4 w-4" />
          </button>
          {accountOpen ? (
            <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-[220px] rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
              <p className="truncate text-sm font-medium text-slate-950">{email}</p>
              <button
                type="button"
                onClick={signOut}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
