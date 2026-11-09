"use client";

import "@/src/styles/crm-framed.css";
import Sidebar from "@/src/components/Sidebar";
import PageBar from "@/src/components/PageBar";
import MobileTopBar from "@/src/components/MobileTopBar";
import MobileMoreSheet from "@/src/components/MobileMoreSheet";
import SettingsMobileNav from "@/src/components/SettingsMobileNav";
import MobileBottomTabBar from "@/src/components/MobileBottomTabBar";
import DbOutageBanner from "@/src/components/DbOutageBanner";
import PermissionGate from "@/src/components/PermissionGate";
import { KbProvider } from "@/src/context/KbContext";
import { EmailProvider } from "@/src/context/EmailContext";
import { SearchProvider } from "@/src/context/SearchContext";
import { MobileChromeProvider } from "@/src/context/MobileChromeContext";
import { usePathname } from "next/navigation";
import { useCrmTheme } from "@/src/context/CrmThemeContext";
import { crmThemeCssVariables } from "@/src/lib/crm-themes";
import { useEffect, useRef, type CSSProperties } from "react";

function isHideHeaderRoute(pathname: string) {
  return /^\/kb\/[^/]+$/.test(pathname) || pathname.startsWith("/assistant");
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { themeId, theme } = useCrmTheme();
  const hideHeader = isHideHeaderRoute(pathname ?? "");
  const frameRef = useRef<HTMLDivElement>(null);
  const isAssistant = (pathname ?? "").startsWith("/assistant");

  // La barra de estado y de navegación del sistema (Android/iOS) toman el color del navbar del tema activo.
  useEffect(() => {
    const color = frameRef.current ? getComputedStyle(frameRef.current).getPropertyValue("--color-surface-sidebar").trim() : "";
    if (!color) return;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const created = !meta;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    const previous = meta.content;
    meta.content = color;
    // Lo que queda detrás de la barra de navegación inferior (Android/iOS) es el fondo de html/body.
    const html = document.documentElement;
    const previousHtml = html.style.backgroundColor;
    const previousBody = document.body.style.backgroundColor;
    html.style.backgroundColor = color;
    document.body.style.backgroundColor = color;
    return () => {
      html.style.backgroundColor = previousHtml;
      document.body.style.backgroundColor = previousBody;
      if (created) meta?.remove();
      else if (meta) meta.content = previous;
    };
  }, [themeId]);

  return (
    <SearchProvider>
      <KbProvider>
        <EmailProvider>
          <MobileChromeProvider>
            <div
              ref={frameRef}
              className="noxy-product-frame flex h-dvh overflow-hidden bg-surface-sidebar"
              data-crm-theme={themeId}
              style={crmThemeCssVariables(theme) as CSSProperties}
            >
              <div className="hidden lg:flex">
                <Sidebar />
              </div>
              <MobileTopBar />
              <MobileMoreSheet />
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <DbOutageBanner />
                {/* Hoja de contenido: lo que separa el marco claro del trabajo. */}
                <div
                  data-crm-sheet
                  className={`flex min-h-0 flex-1 flex-col overflow-hidden border-line bg-surface-app pt-[calc(3.5rem+env(safe-area-inset-top))] lg:border-l lg:border-t lg:pt-0 ${isAssistant ? "pb-[env(safe-area-inset-bottom)]" : ""}`}
                >
                  <SettingsMobileNav />
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
