"use client";

import { authContracts, bootstrapOrganizationSchema, createApiClient } from "@acme/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { setCachedAuthState } from "../../../lib/auth-state";
import { supabaseBrowser } from "../../../lib/supabase-browser";

type SetupValues = z.infer<typeof bootstrapOrganizationSchema>;

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function SetupPage() {
  const router = useRouter();
  const form = useForm<SetupValues>({
    resolver: zodResolver(bootstrapOrganizationSchema),
    defaultValues: { organizationName: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const { data } = await supabaseBrowser.auth.getSession();
    const accessToken = data.session?.access_token;

    if (!accessToken) {
      form.setError("root", { message: "Please sign in again to continue setup." });
      return;
    }

    try {
      const api = createApiClient({
        baseUrl: apiBaseUrl,
        getAccessToken: () => accessToken,
      });
      const user = await api.request(authContracts.bootstrap, { body: values });
      const { data: refreshedSession } = await supabaseBrowser.auth.refreshSession();
      const session = refreshedSession.session ?? data.session;

      if (session) {
        setCachedAuthState({
          kind: "complete",
          session,
          email: session.user.email ?? user.email,
          role: "OWNER",
          checkedAt: Date.now(),
          accessToken: session.access_token,
        });
      }

      router.replace("/dashboard");
    } catch (error) {
      form.setError("root", {
        message: error instanceof Error ? error.message : "Unable to complete workspace setup.",
      });
    }
  });

  useEffect(() => {
    let cancelled = false;

    const checkExistingSetup = async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) return;

      const api = createApiClient({
        baseUrl: apiBaseUrl,
        getAccessToken: () => accessToken,
      });

      try {
        const currentUser = await api.request(authContracts.me);
        if (cancelled) return;
        router.replace(currentUser.role === "USER" ? "/interventions" : "/dashboard");
      } catch {
        // Stay on setup for first workspace creation.
      }
    };

    checkExistingSetup();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
      <form onSubmit={onSubmit} className="panel w-full max-w-lg space-y-4 rounded-[32px] p-6 sm:p-8">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Workspace setup</p>
          <h1 className="mt-3 text-4xl font-semibold text-slate-950">Finish your account</h1>
          <p className="mt-3 text-sm text-slate-500">
            Add your workspace name below so we can create your organization records.
          </p>
        </div>
        <label className="block space-y-2 text-sm">
          <span>Workspace name</span>
          <input
            {...form.register("organizationName")}
            placeholder="Sam's Bakery"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
          />
        </label>
        {form.formState.errors.root?.message ? (
          <p className="text-sm text-red-600">{form.formState.errors.root.message}</p>
        ) : null}
        <button className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-medium text-white">
          Complete setup
        </button>
      </form>
    </div>
  );
}
