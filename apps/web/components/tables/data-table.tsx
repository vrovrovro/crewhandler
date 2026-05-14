import type { ReactNode } from "react";

export function DataTable({
  title,
  columns,
  rows,
  subtitle,
  actions,
  mobileLayout = "cards",
  mobileContent,
}: {
  title: string;
  columns: string[];
  rows: ReactNode[][];
  subtitle?: string;
  actions?: ReactNode;
  mobileLayout?: "cards" | "table";
  mobileContent?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
      <div className="flex flex-row justify-between border-b border-slate-200 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className={`${mobileContent ? "hidden md:block" : mobileLayout === "table" ? "overflow-x-auto" : "hidden md:block"}`}>
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-6 py-4 font-medium uppercase tracking-[0.15em]">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-b border-slate-100 last:border-b-0">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-6 py-4 text-slate-700">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {mobileContent ? <div className="md:hidden">{mobileContent}</div> : null}
      {/* {mobileLayout === "cards" ? (
        <div className="space-y-3 p-4 md:hidden">
          {rows.map((row, rowIndex) => (
            <article key={rowIndex} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <dl className="space-y-3">
                {row.map((cell, cellIndex) => (
                  <div key={cellIndex} className="flex flex-col gap-1">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      {columns[cellIndex]}
                    </dt>
                    <dd className="text-sm text-slate-700">{cell}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      ) : null} */}
    </section>
  );
}
