"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type UserRole } from "@acme/shared";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { Suspense } from "react";
import { GoogleIcon } from "../../../components/auth/google-icon";
import { setCachedAuthState } from "../../../lib/auth-state";
import { supabaseBrowser } from "../../../lib/supabase-browser";
import type { z } from "zod";

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get("redirectTo") ?? null;
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const { data, error } = await supabaseBrowser.auth.signInWithPassword(values);
    if (error) {
      form.setError("root", { message: error.message });
      return;
    }

    if (data.session) {
      const complete = data.session.user.app_metadata?.workspace_complete === true;
      setCachedAuthState({
        kind: complete ? "complete" : "incomplete",
        session: data.session,
        email: data.session.user.email ?? null,
        role: (data.session.user.app_metadata?.workspace_role as UserRole | undefined) ?? (complete ? "ADMIN" : null),
        checkedAt: Date.now(),
        accessToken: data.session.access_token,
      });
    }

    router.replace(redirectTo ?? (data.session?.user.app_metadata?.workspace_complete === true ? "/dashboard" : "/setup"));
  });

  const signInWithGoogle = async () => {
    const { error } = await supabaseBrowser.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${redirectTo ?? "/setup"}`,
      },
    });

    if (error) {
      form.setError("root", { message: error.message });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
      <form onSubmit={onSubmit} className="panel w-full max-w-md space-y-4 rounded-[32px] p-6 sm:p-8">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">FieldFlow OS</p>
          <h1 className="mt-3 text-4xl font-semibold text-slate-950">Sign in</h1>
          <p className="mt-3 text-sm text-slate-500">
            Access dispatching, client operations, and field-service workflows from one control center.
          </p>
        </div>
        <label className="block space-y-2 text-sm">
          <span>Email</span>
          <input
            {...form.register("email")}
            placeholder="you@company.com"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
          />
        </label>
        <label className="block space-y-2 text-sm">
          <span>Password</span>
          <input
            type="password"
            {...form.register("password")}
            placeholder="Enter your password"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
          />
        </label>
        {form.formState.errors.root?.message ? (
          <p className="text-sm text-red-600">{form.formState.errors.root.message}</p>
        ) : null}
        <button
          type="button"
          onClick={signInWithGoogle}
          className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 font-medium text-slate-950"
        >
          <GoogleIcon />
          Continue with Google
        </button>
        <button className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-medium text-white">
          Sign in
        </button>
        <p className="text-sm text-slate-500">
          Need an account? <Link href="/signup" className="text-slate-950 underline">Create one</Link>
        </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center p-4 sm:p-6"><div className="panel w-full max-w-md rounded-[32px] p-6 sm:p-8"><p className="text-sm text-slate-500">Loading...</p></div></div>}>
      <LoginPageContent />
    </Suspense>
  );
}
