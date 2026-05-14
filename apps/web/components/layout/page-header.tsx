import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)] sm:px-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950 sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500 sm:text-base">{description}</p>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </section>
  );
}
