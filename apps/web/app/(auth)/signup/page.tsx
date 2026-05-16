"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema } from "@acme/shared";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { GoogleIcon } from "../../../components/auth/google-icon";
import { setCachedAuthState } from "../../../lib/auth-state";
import { supabaseBrowser } from "../../../lib/supabase-browser";

type SignUpFormValues = z.infer<typeof signUpSchema>;

function SignUpPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get("redirectTo") ?? null;
  const [notice, setNotice] = useState<string | null>(null);
  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      setNotice(null);
      const { data, error } = await supabaseBrowser.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.fullName,
          },
          emailRedirectTo: `${window.location.origin}${redirectTo ?? "/setup"}`,
        },
      });

      if (error) {
        form.setError("root", { message: error.message });
        return;
      }

      const session = data.session;
      const accessToken = session?.access_token;
      if (!session || !accessToken) {
        setNotice("Check your email to verify your account, then sign in to finish workspace setup.");
        return;
      }

      setCachedAuthState({
        kind: "incomplete",
        session,
        email: session.user.email ?? null,
        role: null,
        checkedAt: Date.now(),
        accessToken,
      });

      router.push(redirectTo ?? "/setup");
    } catch (submitError) {
      form.setError("root", {
        message: submitError instanceof Error ? submitError.message : "Unable to create your account.",
      });
    }
  });

  const signUpWithGoogle = async () => {
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
      <form onSubmit={onSubmit} className="panel w-full max-w-xl space-y-4 rounded-[32px] p-6 sm:p-8">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">FieldFlow OS</p>
          <h1 className="mt-3 text-4xl font-semibold text-slate-950">Create account</h1>
          <p className="mt-3 text-sm text-slate-500">
            Start with your account details. After verification, we&apos;ll ask for the workspace name.
          </p>
        </div>

        <label className="block space-y-2 text-sm">
          <span>Full name</span>
          <input
            {...form.register("fullName")}
            placeholder="Sam Lee"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
          />
        </label>

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
            placeholder="Create a password"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
          />
        </label>

        <label className="block space-y-2 text-sm">
          <span>Confirm password</span>
          <input
            type="password"
            {...form.register("confirmPassword")}
            placeholder="Re-enter your password"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
          />
        </label>

        {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}
        {form.formState.errors.root?.message ? (
          <p className="text-sm text-red-600">{form.formState.errors.root.message}</p>
        ) : null}

        <button
          type="button"
          onClick={signUpWithGoogle}
          className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 font-medium text-slate-950"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <button className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-medium text-white">Create account</button>

        <p className="text-sm text-slate-500">
          Already have an account?{" "}
          <Link
            href={redirectTo ? `/login?redirectTo=${encodeURIComponent(redirectTo)}` : "/login"}
            className="text-slate-950 underline"
          >
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center p-4 sm:p-6"><div className="panel w-full max-w-xl rounded-[32px] p-6 sm:p-8"><p className="text-sm text-slate-500">Loading...</p></div></div>}>
      <SignUpPageContent />
    </Suspense>
  );
}
