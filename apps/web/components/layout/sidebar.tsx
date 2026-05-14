"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardList, LayoutDashboard, Receipt, Settings, Users, Wrench, X } from "lucide-react";
import { useEffect, useState } from "react";
import { peekAuthState, resolveAuthState } from "../../lib/auth-state";
import type { UserRole } from "@acme/shared";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/interventions", label: "Interventions", icon: ClipboardList },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  open,
  onClose,
  collapsed,
  onToggleCollapse,
}: {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const pathname = usePathname();
  const [role, setRole] = useState<UserRole | null>(() => peekAuthState()?.role ?? null);

  useEffect(() => {
    resolveAuthState(true).then((state) => setRole(state.role));
  }, []);

  const availableItems = navItems.filter((item) => {
    if (role === "USER") {
      return item.href === "/interventions" || item.href === "/settings";
    }
    if ((role === "OWNER" || role === "ADMIN") && item.href === "/settings") {
      return true;
    }
    return item.href !== "/settings";
  });

  return (
    <>
      {open ? <button className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden" onClick={onClose} /> : null}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-[100dvh] w-[290px] flex-col justify-between overflow-y-auto border-r border-slate-200 bg-white p-4 transition-transform duration-200 lg:static lg:h-full lg:w-full lg:translate-x-0 lg:rounded-l-[32px] ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-3 rounded-full bg-slate-100 px-3 py-2 text-xs uppercase tracking-[0.3em] text-slate-500">
                <Wrench className="h-3.5 w-3.5" />
                {!collapsed ? "FieldFlow OS" : null}
              </div>
              {!collapsed ? (
                <>
                  
                </>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onToggleCollapse}
                className="hidden rounded-2xl border border-slate-200 p-2 text-slate-400 lg:inline-flex"
              >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
              <button onClick={onClose} className="rounded-2xl p-2 text-slate-400 lg:hidden">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <nav className="space-y-1">
            {availableItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-slate-950 text-white"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                  } ${collapsed ? "justify-center" : ""}`}
                  title={item.label}
                >
                  <Icon className="h-4 w-4" />
                  {!collapsed ? item.label : null}
                </Link>
              );
            })}
          </nav>
        </div>
        {!collapsed ? (
          <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 text-sm text-slate-900">
            <p className="font-semibold">Operations snapshot</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xl font-semibold">24</p>
                <p className="text-xs text-slate-400">Scheduled today</p>
              </div>
              <div>
                <p className="text-xl font-semibold">98%</p>
                <p className="text-xs text-slate-400">SLA adherence</p>
              </div>
            </div>
          </div>
        ) : null}
      </aside>
    </>
  );
}
