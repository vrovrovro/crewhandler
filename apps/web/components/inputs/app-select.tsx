"use client";

import { ChevronDown } from "lucide-react";
import { forwardRef } from "react";

type AppSelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const AppSelect = forwardRef<HTMLSelectElement, AppSelectProps>(function AppSelect(
  { className = "", children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={`w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-11 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
        {...props}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
        <ChevronDown className="h-4 w-4" />
      </span>
    </div>
  );
});
