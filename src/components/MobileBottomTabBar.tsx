"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Home01Icon, Megaphone01Icon, MoreHorizontalCircle01Icon } from "@hugeicons/core-free-icons";
import { NAV_ICONS } from "@/src/components/sidebar-parts";
import { useMobileTabs } from "@/src/hooks/useMobileTabs";
import { useOptionalMobileChrome } from "@/src/context/MobileChromeContext";
import { activeMobileTab } from "@/src/lib/crm-navigation";

const iconFor = (href: string) => NAV_ICONS[href] ?? (href.startsWith("/contenido") ? Megaphone01Icon : Home01Icon);

const itemClass =
  "relative flex min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-full px-1 text-xs outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-focus motion-reduce:transition-none";
const ACTIVE = "bg-[color-mix(in_srgb,var(--color-surface-elevated)_88%,transparent)] font-semibold text-[var(--nav-active-ink)] shadow-[0_1px_4px_rgba(11,11,24,0.12)]";
const IDLE = "font-medium text-text-secondary-strong hover:text-text-primary";

/**
 * Barra inferior móvil en cápsula flotante, de cristal translúcido (estilo «liquid glass»): Inicio, tres secciones a tu elección y «Más»,
 * que abre la hoja de secciones. El asistente la oculta para no tapar el campo de mensaje.
 */
export default function MobileBottomTabBar() {
  const pathname = usePathname() ?? "/";
  const mobileChrome = useOptionalMobileChrome();
  const { tabs } = useMobileTabs();
  const activeHref = activeMobileTab(pathname, tabs);

  if (pathname === "/assistant" || pathname.startsWith("/assistant/")) return null;

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-[55] flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden pointer-events-none"
    >
      <ul className="pointer-events-auto flex w-full max-w-sm items-stretch gap-0.5 rounded-full border border-white/50 bg-[color-mix(in_srgb,var(--color-surface-elevated)_58%,transparent)] p-1.5 shadow-[0_10px_32px_rgba(11,11,24,0.16),inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-2xl backdrop-saturate-150 [@supports_not_(backdrop-filter:blur(1px))]:bg-surface-elevated">
        {tabs.map((tab) => {
          const isActive = tab.href === activeHref;
          return (
            <li key={tab.href} className="min-w-0 flex-1">
              <Link href={tab.href} aria-current={isActive ? "page" : undefined} className={`${itemClass} ${isActive ? ACTIVE : IDLE}`}>
                <HugeiconsIcon icon={iconFor(tab.href)} size={21} aria-hidden="true" />
                <span className="max-w-full truncate">{tab.label}</span>
              </Link>
            </li>
          );
        })}
        <li className="min-w-0 flex-1">
          <button type="button" aria-haspopup="dialog" onClick={() => mobileChrome?.openMobileSidebar()} className={`${itemClass} ${activeHref === null ? ACTIVE : IDLE}`}>
            <HugeiconsIcon icon={MoreHorizontalCircle01Icon} size={21} aria-hidden="true" />
            <span>Más</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
