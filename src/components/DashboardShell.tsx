"use client";

import Sidebar from "@/src/components/Sidebar";
import Header from "@/src/components/Header";
import { KbProvider } from "@/src/context/KbContext";
import { EmailProvider } from "@/src/context/EmailContext";
import { usePathname } from "next/navigation";

function isKbEditorRoute(pathname: string) {
  return /^\/kb\/[^/]+$/.test(pathname);
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideHeader = isKbEditorRoute(pathname ?? "");

  return (
    <KbProvider>
      <EmailProvider>
        <div className="flex h-screen overflow-hidden bg-surface-app">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-surface-elevated">
            {!hideHeader && <Header />}
            <div className={`flex-1 flex flex-col overflow-hidden min-h-0 ${hideHeader ? "bg-transparent" : ""}`}>
              {children}
            </div>
          </div>
        </div>
      </EmailProvider>
    </KbProvider>
  );
}
