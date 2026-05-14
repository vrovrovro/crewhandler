"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-lg rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">Something went wrong</p>
        <h1 className="mt-4 text-3xl font-semibold text-slate-950">We hit an unexpected error</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          {error.message || "Please try again."}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white"
          >
            Try again
          </button>
          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700"
          >
            Back to login
          </a>
        </div>
      </div>
    </main>
  );
}
