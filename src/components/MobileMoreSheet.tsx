"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, CheckmarkCircle02Icon, Home01Icon, Megaphone01Icon, Settings01Icon, User02Icon } from "@hugeicons/core-free-icons";
import { NAV_ICONS } from "@/src/components/sidebar-parts";
import { useDialog } from "@/src/components/ui";
import { useOptionalMobileChrome } from "@/src/context/MobileChromeContext";
import { useMobileTabs } from "@/src/hooks/useMobileTabs";
import { MAX_CUSTOM_TABS, activeNavHref, visibleModes } from "@/src/lib/crm-navigation";
import type { ModulePermissions, RoleName } from "@/src/lib/permissions";

function iconFor(href: string) {
  return NAV_ICONS[href] ?? (href.startsWith("/contenido") ? Megaphone01Icon : Home01Icon);
}

/**
 * Menú «Más» del móvil: hoja que sube desde abajo con todas las secciones en una cuadrícula de iconos.
 * No reutiliza la sidebar de escritorio. Se abre desde la barra inferior y desde el botón de menú.
 */
export default function MobileMoreSheet() {
  const pathname = usePathname() ?? "/";
  const { data: session } = useSession();
  const mobileChrome = useOptionalMobileChrome();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const { selected, toggle, reset } = useMobileTabs();
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    setEditing(false);
  }, []);
  useDialog(ref, open, close);

  useEffect(() => {
    if (!mobileChrome) return;
    mobileChrome.registerOpenMobileSidebar(() => setOpen(true));
    return () => mobileChrome.registerOpenMobileSidebar(null);
  }, [mobileChrome]);

  // Cambiar de pantalla cierra la hoja.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (open) close();
  }

  const role = session?.role as RoleName | undefined;
  const permissions = session?.permissions as ModulePermissions | undefined;
  const modes = visibleModes(role, permissions);
  const all = modes.flatMap((mode) => mode.groups.flatMap((group) => group.items.map((item) => item.href)));
  const active = activeNavHref(pathname, all);

  if (!open) return null;

  const tileBody = (label: string, icon: typeof Home01Icon, isActive: boolean, picked = false) => (
    <>
      <span
        aria-hidden="true"
        className={`relative flex size-11 items-center justify-center rounded-full border ${isActive || picked ? "border-line bg-nav-active text-[var(--nav-active-ink)]" : "border-transparent bg-surface-sidebar text-text-secondary-strong"}`}
      >
        <HugeiconsIcon icon={icon} size={20} />
        {picked && (
          <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-action-primary text-action-primary-foreground">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} />
          </span>
        )}
      </span>
      <span className={`max-w-full truncate text-xs ${isActive || picked ? "font-semibold text-text-primary" : "font-medium text-text-secondary-strong"}`}>{label}</span>
    </>
  );
  const tileClass = "flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-surface px-1 py-2 text-center outline-none focus-visible:ring-2 focus-visible:ring-focus";
  const full = selected.length >= MAX_CUSTOM_TABS;

  const tile = (href: string, label: string, icon: typeof Home01Icon, isActive: boolean, pickable = false) => {
    if (editing && pickable) {
      const picked = selected.includes(href);
      return (
        <button key={href} type="button" aria-pressed={picked} disabled={!picked && full} onClick={() => toggle(href)} className={`${tileClass} disabled:opacity-40`}>
          {tileBody(label, icon, false, picked)}
        </button>
      );
    }
    if (editing) return null;
    return (
      <Link key={href} href={href} onClick={close} aria-current={isActive ? "page" : undefined} className={tileClass}>
        {tileBody(label, icon, isActive)}
      </Link>
    );
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end bg-brand-obsidian/35 lg:hidden" onClick={close}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Menú"
        onClick={(event) => event.stopPropagation()}
        className="crm-sheet-up max-h-[85dvh] w-full overflow-y-auto rounded-t-2xl border border-b-0 border-line bg-surface-elevated pb-[calc(1rem+env(safe-area-inset-bottom))]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between bg-surface-elevated px-5 pb-1 pt-3">
          <span aria-hidden="true" className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-line" />
          <h2 className="pt-3 text-base font-semibold text-text-primary">{editing ? "Tu barra inferior" : "Menú"}</h2>
          <button
            type="button"
            onClick={() => setEditing((value) => !value)}
            className="ml-auto mr-1 mt-3 inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm font-medium text-text-primary hover:bg-nav-hover"
          >
            {editing ? "Listo" : "Personalizar barra"}
          </button>
          <button type="button" onClick={close} aria-label="Cerrar menú" className="mt-3 flex size-11 items-center justify-center rounded-full text-text-secondary hover:bg-nav-hover">
            <HugeiconsIcon icon={Cancel01Icon} size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="flex flex-col gap-4 px-3 pb-2">
          {editing && (
            <p className="flex items-center justify-between gap-3 px-2 text-sm text-text-secondary">
              <span>Inicio y Más son fijos. Elige hasta {MAX_CUSTOM_TABS} secciones ({selected.length} de {MAX_CUSTOM_TABS}).</span>
              <button type="button" onClick={reset} className="min-h-11 shrink-0 px-2 text-sm font-semibold text-action-primary hover:underline">
                Restablecer
              </button>
            </p>
          )}
          {modes.map((mode) => (
            <section key={mode.key} aria-label={mode.label}>
              <h3 className="px-2 pb-1 text-xs font-medium text-text-secondary-strong">{mode.label}</h3>
              <div className="grid grid-cols-4 gap-1">
                {mode.groups.flatMap((group) => group.items).map((item) => tile(item.href, item.label, iconFor(item.href), item.href === active, item.href !== "/"))}
              </div>
            </section>
          ))}
          {!editing && (
          <section aria-label="Cuenta">
            <h3 className="px-2 pb-1 text-xs font-medium text-text-secondary-strong">Cuenta</h3>
            <div className="grid grid-cols-4 gap-1">
              {tile("/settings", "Ajustes", Settings01Icon, false)}
              {tile("/profile", "Perfil", User02Icon, false)}
            </div>
          </section>
          )}
        </div>
      </div>
    </div>
  );
}
