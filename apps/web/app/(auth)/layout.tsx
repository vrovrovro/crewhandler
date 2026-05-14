import type { ReactNode } from "react";
import { GuestGate } from "../../components/auth/guest-gate";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <GuestGate>{children}</GuestGate>;
}
