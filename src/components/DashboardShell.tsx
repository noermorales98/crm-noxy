"use client";

import "@/src/styles/crm-framed.css";
import Sidebar from "@/src/components/Sidebar";
import PageBar from "@/src/components/PageBar";
import AssistantSidebarShell from "@/src/components/AssistantSidebarShell";
import MobileBottomTabBar from "@/src/components/MobileBottomTabBar";
import MobileSidebarToggle from "@/src/components/MobileSidebarToggle";
import DbOutageBanner from "@/src/components/DbOutageBanner";
import PermissionGate from "@/src/components/PermissionGate";
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
  const showAssistantMobileChrome =
    hideHeader && (pathname ?? "").startsWith("/assistant");

  return (
    <SearchProvider>
      <KbProvider>
        <EmailProvider>
          <MobileChromeProvider>
            <div
              className="noxy-product-frame flex h-dvh overflow-hidden bg-surface-sidebar"
              data-crm-theme={themeId}
              style={crmThemeCssVariables(theme) as CSSProperties}
            >
              <div className="hidden lg:flex">
                <Sidebar />
              </div>
              <div className="lg:hidden">
                <AssistantSidebarShell />
              </div>
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <DbOutageBanner />
                {showAssistantMobileChrome && (
                  <div className="crm-header-chrome-solid crm-safe-top shrink-0 lg:hidden">
                    <div className="flex h-12 items-center gap-2 px-3">
                      <MobileSidebarToggle />
                      <span className="truncate text-sm font-semibold text-text-primary">
                        Asistente
                      </span>
                    </div>
                  </div>
                )}
                {/* Hoja de contenido: lo que separa el marco claro del trabajo. */}
                <div
                  data-crm-sheet
                  className={`${showAssistantMobileChrome ? "" : "crm-safe-top"} flex min-h-0 flex-1 flex-col overflow-hidden border-line bg-surface-app lg:border-l lg:border-t`}
                >
                  {!hideHeader && <PageBar />}
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
