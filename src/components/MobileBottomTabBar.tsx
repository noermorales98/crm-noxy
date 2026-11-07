"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  BarChartIcon,
  Home01Icon,
  MoreHorizontalCircle01Icon,
  Task01Icon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons";
import { useOptionalMobileChrome } from "@/src/context/MobileChromeContext";
import { MOBILE_TAB_ACTIVE, activeMobileTab, visibleMobileTabs } from "@/src/lib/crm-navigation";
import type { ModulePermissions, RoleName } from "@/src/lib/permissions";

const TAB_ICONS: Record<string, typeof Home01Icon> = {
  "/": Home01Icon,
  "/contacts": UserMultipleIcon,
  "/pipeline": BarChartIcon,
  "/tasks": Task01Icon,
};

const tabClass =
  "flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 text-xs transition-colors duration-200 motion-reduce:transition-none";

/** Barra inferior móvil del marco claro: cuatro destinos fijos y «Más», que abre la navegación completa. */
export default function MobileBottomTabBar() {
  const pathname = usePathname() ?? "/";
  const { data: session } = useSession();
  const mobileChrome = useOptionalMobileChrome();
  const role = session?.role as RoleName | undefined;
  const permissions = session?.permissions as ModulePermissions | undefined;
  const tabs = visibleMobileTabs(role, permissions);
  const activeHref = activeMobileTab(pathname, tabs);

  // El asistente tiene su propio chrome móvil.
  if (pathname === "/assistant" || pathname.startsWith("/assistant/")) return null;

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-[55] border-t border-line bg-surface-sidebar pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch">
        {tabs.map((tab) => {
          const isActive = tab.href === activeHref;
          return (
            <li key={tab.href} className="min-w-0 flex-1">
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={`${tabClass} ${isActive ? MOBILE_TAB_ACTIVE : "font-medium text-text-secondary hover:text-text-primary"}`}
              >
                <HugeiconsIcon icon={TAB_ICONS[tab.href] ?? Home01Icon} size={22} />
                <span className="max-w-full truncate">{tab.label}</span>
              </Link>
            </li>
          );
        })}
        <li className="min-w-0 flex-1">
          <button
            type="button"
            aria-controls="assistant-sidebar"
            aria-haspopup="dialog"
            onClick={() => mobileChrome?.openMobileSidebar()}
            className={`${tabClass} ${activeHref === null ? MOBILE_TAB_ACTIVE : "font-medium text-text-secondary hover:text-text-primary"}`}
          >
            <HugeiconsIcon icon={MoreHorizontalCircle01Icon} size={22} />
            <span>Más</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
