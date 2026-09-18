"use client";

import Sidebar from "@/src/components/Sidebar";
import Header from "@/src/components/Header";
import AssistantSidebarShell from "@/src/components/AssistantSidebarShell";
import MobileBottomTabBar from "@/src/components/MobileBottomTabBar";
import MobileSidebarToggle from "@/src/components/MobileSidebarToggle";
import DbOutageBanner from "@/src/components/DbOutageBanner";
import PermissionGate from "@/src/components/PermissionGate";
import { isAssistantRoute } from "@/src/components/assistant-new-sidebar-state";
import { KbProvider } from "@/src/context/KbContext";
import { EmailProvider } from "@/src/context/EmailContext";
import { SearchProvider } from "@/src/context/SearchContext";
import { MobileChromeProvider } from "@/src/context/MobileChromeContext";
import { usePathname } from "next/navigation";
import { useCrmTheme } from "@/src/context/CrmThemeContext";
import { crmThemeCssVariables } from "@/src/lib/crm-themes";
import type { CSSProperties } from "react";

function isHideHeaderRoute(pathname: string) {
  return /^\/kb\/[^/]+$/.test(pathname) || pathname.startsWith("/assistant");
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { themeId, theme } = useCrmTheme();
  const hideHeader = isHideHeaderRoute(pathname ?? "");
  const useFloatingAssistantSidebar = isAssistantRoute(pathname ?? "");
  const showAssistantMobileChrome =
    hideHeader && (pathname ?? "").startsWith("/assistant");

  return (
    <SearchProvider>
      <KbProvider>
        <EmailProvider>
          <MobileChromeProvider>
            <div
              className="flex h-screen overflow-hidden bg-surface-app"
              data-crm-theme={themeId}
              style={crmThemeCssVariables(theme) as CSSProperties}
            >
              {useFloatingAssistantSidebar ? (
                <AssistantSidebarShell />
              ) : (
                <>
                  <div className="hidden lg:flex">
                    <Sidebar />
                  </div>
                  <div className="lg:hidden">
                    <AssistantSidebarShell />
                  </div>
                </>
              )}
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-surface-app">
                <DbOutageBanner />
                {!hideHeader && <Header />}
                {showAssistantMobileChrome && (
                  <div className="crm-header-chrome crm-safe-top shrink-0 lg:hidden">
                    <div className="flex h-12 items-center gap-2 px-3">
                      <MobileSidebarToggle />
                      <span className="truncate text-sm font-semibold text-text-primary">
                        Asistente
                      </span>
                    </div>
                  </div>
                )}
                <div
                  className={`flex min-h-0 flex-1 flex-col overflow-hidden ${
                    hideHeader ? "bg-transparent" : ""
                  }`}
                >
                  <PermissionGate>{children}</PermissionGate>
                </div>
              </div>
              <MobileBottomTabBar />
            </div>
          </MobileChromeProvider>
        </EmailProvider>
      </KbProvider>
    </SearchProvider>
  );
}
