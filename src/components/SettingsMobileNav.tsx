"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, ArrowUp01Icon, Settings01Icon } from "@hugeicons/core-free-icons";
import { canManageTeam, type ModulePermissions, type RoleName } from "@/src/lib/permissions";
import { activeNavHref, isSettingsRoute, visibleSettingsItems } from "@/src/lib/crm-navigation";

/** Móvil: selector de apartado de Ajustes y Perfil (la sidebar de Ajustes solo existe en escritorio). */
export default function SettingsMobileNav() {
  const pathname = usePathname() ?? "/";
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }
  if (!isSettingsRoute(pathname)) return null;

  const role = session?.role as RoleName | undefined;
  const permissions = session?.permissions as ModulePermissions | undefined;
  const items = [...visibleSettingsItems(role, permissions, canManageTeam(role)).map((item) => ({ href: item.href, label: item.label, group: item.group as string })), { href: "/profile", label: "Perfil", group: "Personal" }];
  const active = activeNavHref(pathname, items.map((item) => item.href));
  const current = items.find((item) => item.href === active)?.label ?? "Ajustes";

  return (
    <div className="relative z-20 shrink-0 border-b border-line bg-surface-elevated px-4 py-2 lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex min-h-11 w-full items-center gap-3 rounded-full border border-line px-4 text-left text-sm font-medium text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <HugeiconsIcon icon={Settings01Icon} size={16} aria-hidden="true" className="shrink-0 text-text-secondary-strong" />
        <span className="min-w-0 flex-1 truncate">
          <span className="text-text-secondary">Ajustes · </span>
          {current}
        </span>
        <HugeiconsIcon icon={open ? ArrowUp01Icon : ArrowDown01Icon} size={14} aria-hidden="true" className="shrink-0 text-text-secondary-strong" />
      </button>
      {open && (
        <>
          <button type="button" aria-label="Cerrar" tabIndex={-1} className="fixed inset-0 -z-10 cursor-default" onClick={() => setOpen(false)} />
          <div role="menu" className="crm-floating-menu absolute inset-x-4 top-full mt-1 max-h-[60dvh] overflow-y-auto rounded-surface border border-line bg-surface-elevated py-1">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                aria-current={item.href === active ? "page" : undefined}
                className={`flex min-h-11 items-center px-4 text-sm hover:bg-nav-hover ${item.href === active ? "bg-nav-active font-semibold text-[var(--nav-active-ink)]" : "text-text-primary"}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
