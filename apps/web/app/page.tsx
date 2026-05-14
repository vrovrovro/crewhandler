"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { resolveAuthState } from "../lib/auth-state";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const route = async () => {
      const authState = await resolveAuthState();

      if (authState.kind === "guest") {
        router.replace("/login");
        return;
      }

      if (authState.kind === "complete") {
        router.replace(authState.role === "USER" ? "/interventions" : "/dashboard");
        return;
      }

      router.replace("/setup");
    };

    route();
  }, [router]);

  return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading...</div>;
}
