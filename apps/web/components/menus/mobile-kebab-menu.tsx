"use client";

import Link from "next/link";
import { MoreVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type MenuItem = {
  label: string;
  href?: string;
  onClick?: () => void;
  tone?: "default" | "danger";
};

export function MobileKebabMenu({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleOutside);
    }

    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  return (
    <div ref={rootRef} className="relative md:hidden">
      <button
        type="button"
        aria-label="Open row actions"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-20 min-w-[160px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.16)]">
          {items.map((item) =>
            item.href ? (
              <Link
                key={`${item.label}-${item.href}`}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`block px-4 py-3 text-sm ${
                  item.tone === "danger" ? "text-rose-600" : "text-slate-700"
                }`}
              >
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setOpen(false);
                  item.onClick?.();
                }}
                className={`block w-full px-4 py-3 text-left text-sm ${
                  item.tone === "danger" ? "text-rose-600" : "text-slate-700"
                }`}
              >
                {item.label}
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
