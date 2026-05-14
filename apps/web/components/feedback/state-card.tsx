import type { ReactNode } from "react";

export function StateCard({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <section className="panel rounded-[28px] border border-dashed border-slate-300 p-8 text-center">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}
