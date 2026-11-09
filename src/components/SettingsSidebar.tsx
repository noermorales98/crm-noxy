"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AiMagicIcon,
  ArrowLeft01Icon,
  Calendar01Icon,
  Notification01Icon,
  PaintBrush01Icon,
  PlugSocketIcon,
  Settings01Icon,
  User02Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import AccountMenu from "@/src/components/AccountMenu";
import { NavLeaf, groupLabelClass } from "@/src/components/sidebar-parts";
import { canManageTeam, type ModulePermissions, type RoleName } from "@/src/lib/permissions";
import { activeNavHref, visibleSettingsItems, type SettingsGroup } from "@/src/lib/crm-navigation";

const ICONS: Record<string, typeof Settings01Icon> = {
  "/settings": Settings01Icon,
  "/settings/equipo": UserGroupIcon,
  "/settings/notificaciones": Notification01Icon,
  "/settings/digest": Calendar01Icon,
  "/settings/integraciones": PlugSocketIcon,
  "/settings/ai-models": AiMagicIcon,
  "/settings/apariencia": PaintBrush01Icon,
  "/profile": User02Icon,
};

const GROUP_ORDER: SettingsGroup[] = ["Organización", "Conexiones", "Personal"];

/**
 * Sidebar propia de Ajustes y Perfil: reemplaza a la principal en esas rutas. Cada apartado es una
 * pantalla distinta; arriba, la salida al CRM; abajo, la cuenta.
 */
export default function SettingsSidebar({ variant = "docked", onNavigate }: { variant?: "docked" | "floating" | "pinned"; onNavigate?: () => void }) {
  const pathname = usePathname() ?? "/";
  const { data: session } = useSession();
  const role = session?.role as RoleName | undefined;
  const permissions = session?.permissions as ModulePermissions | undefined;
  const items = visibleSettingsItems(role, permissions, canManageTeam(role));
  const profile = { href: "/profile", label: "Perfil", group: "Personal" as SettingsGroup };
  const all = [...items, profile];
  const active = activeNavHref(pathname, all.map((item) => item.href));

  const shell =
    variant === "docked"
      ? "crm-sidebar-width flex h-full w-60 shrink-0 flex-col border-r border-line bg-surface-sidebar"
      : "flex h-full w-full flex-col rounded-surface border border-line bg-surface-sidebar";

  return (
    <aside aria-label="Ajustes" className={shell}>
      <div className="shrink-0 px-3 pb-2 pt-3">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex min-h-11 items-center gap-2 rounded-control px-2 text-sm text-text-secondary-strong outline-none hover:bg-nav-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-focus"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} aria-hidden="true" />
          Volver al CRM
        </Link>
        <h2 className="px-2 pb-1 pt-3 text-base font-semibold text-text-primary">Ajustes</h2>
      </div>

      <nav aria-label="Apartados de Ajustes" className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3">
        {GROUP_ORDER.map((group, index) => {
          const rows = all.filter((item) => item.group === group);
          if (rows.length === 0) return null;
          return (
            <div key={group}>
              <p className={index === 0 ? "px-3 pb-1 pt-2 text-xs font-medium text-text-secondary-strong" : groupLabelClass}>{group}</p>
              {rows.map((item) => (
                <NavLeaf key={item.href} href={item.href} label={item.label} icon={ICONS[item.href] ?? Settings01Icon} isActive={item.href === active} onChoose={onNavigate} />
              ))}
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-line px-3 py-2">
        <AccountMenu placement="up" identity="always" onNavigate={onNavigate} className="w-full" />
      </div>
    </aside>
  );
}
