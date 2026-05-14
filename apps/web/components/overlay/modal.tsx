"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 p-0 sm:items-center sm:p-6">
      <button aria-label="Close modal backdrop" className="absolute inset-0" onClick={onClose} />
      <section className="relative z-10 max-h-[92vh] w-full overflow-hidden rounded-t-[28px] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.2)] sm:max-w-3xl sm:rounded-[32px]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-6">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">{title}</h2>
            {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
          </div>
          <button
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[calc(92vh-92px)] overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
      </section>
    </div>
  );
}
