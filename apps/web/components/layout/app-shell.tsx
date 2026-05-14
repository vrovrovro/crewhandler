"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="h-[100dvh] overflow-hidden bg-slate-50">
      <div className={`mx-auto grid h-full max-w-[1600px] gap-0 rounded-none lg:border lg:border-slate-200 lg:bg-white lg:shadow-[0_24px_80px_rgba(15,23,42,0.08)] ${sidebarCollapsed ? "lg:grid-cols-[104px_1fr]" : "lg:grid-cols-[288px_1fr]"}`}>
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
        />
        <main className="min-h-0 min-w-0 overflow-y-auto p-3 sm:p-4 lg:p-5">
          <div className="space-y-4 pb-8">
            <Topbar onOpenSidebar={() => setSidebarOpen(true)} />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
