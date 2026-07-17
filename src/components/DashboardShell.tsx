"use client";

import Sidebar from "@/src/components/Sidebar";
import Header from "@/src/components/Header";
import AssistantSidebarShell from "@/src/components/AssistantSidebarShell";
import { isAssistantRoute } from "@/src/components/assistant-new-sidebar-state";
import { KbProvider } from "@/src/context/KbContext";
import { EmailProvider } from "@/src/context/EmailContext";
import { SearchProvider } from "@/src/context/SearchContext";
import { usePathname } from "next/navigation";

function isHideHeaderRoute(pathname: string) {
  return /^\/kb\/[^/]+$/.test(pathname) || pathname.startsWith("/assistant");
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideHeader = isHideHeaderRoute(pathname ?? "");
  const useFloatingAssistantSidebar = isAssistantRoute(pathname ?? "");

  return (
    <SearchProvider>
      <KbProvider>
        <EmailProvider>
          <div className="flex h-screen overflow-hidden bg-surface-app">
            {useFloatingAssistantSidebar ? <AssistantSidebarShell /> : <Sidebar />}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-surface-app">
              {!hideHeader && <Header />}
              <div className={`flex-1 flex flex-col overflow-hidden min-h-0 ${hideHeader ? "bg-transparent" : ""}`}>
                {children}
              </div>
            </div>
          </div>
        </EmailProvider>
      </KbProvider>
    </SearchProvider>
  );
}
