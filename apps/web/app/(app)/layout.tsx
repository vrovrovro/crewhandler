import type { ReactNode } from "react";
import { AppShell } from "../../components/layout/app-shell";
import { SessionGate } from "../../components/auth/session-gate";

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return (
    <SessionGate>
      <AppShell>{children}</AppShell>
    </SessionGate>
  );
}
