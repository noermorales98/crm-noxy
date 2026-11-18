"use client";

import DashboardShell from "@/src/components/DashboardShell";
import { CrmThemeProvider } from "@/src/context/CrmThemeContext";

/** Shell del panel cuando `/` sirve el dashboard (la landing no lo usa). */
export default function HomeDashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <CrmThemeProvider>
      <DashboardShell>{children}</DashboardShell>
    </CrmThemeProvider>
  );
}
