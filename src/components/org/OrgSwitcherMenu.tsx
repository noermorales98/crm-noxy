"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, ArrowDown01Icon, CheckmarkCircle02Icon, Home01Icon, UserMultipleIcon } from "@hugeicons/core-free-icons";
import { useThemeBoot } from "@/src/context/CrmThemeContext";
import { hasPermission, type ModulePermissions, type RoleName } from "@/src/lib/permissions";
import OrgMark from "./OrgMark";
import { useOrgSwitch } from "./useOrgSwitch";

const ITEM =
  "flex min-h-11 w-full items-center gap-2.5 rounded-control px-2 text-left text-sm text-text-primary outline-none transition-colors hover:bg-nav-hover focus-visible:bg-nav-hover focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-60 motion-reduce:transition-none";

type Props = {
  /** Sidebar plegada: solo la marca, y el menú se abre a la derecha. */
  collapsed?: boolean;
  onNavigate?: () => void;
  /** Etiqueta flotante del modo plegado (la sidebar ya trae su propio sistema). */
  tipProps?: Record<string, unknown>;
};

/**
 * Cabecera de la barra lateral: la marca y el nombre de la empresa actual; al pulsar, el cambio de cuenta.
 * Sin bordes propios: el botón solo se tiñe al pasar el puntero (como el resto de controles de la barra) y el menú usa
 * el mismo panel que Notificaciones. Noxy conserva su isotipo; las demás empresas llevan su color e icono.
 */
export default function OrgSwitcherMenu({ collapsed = false, onNavigate, tipProps }: Props) {
  const boot = useThemeBoot();
  const { data: session } = useSession();
  const { orgs, busy, error, load, switchTo, create } = useOrgSwitch();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const current = boot.org;
  const title = current?.name ?? "Noxy";
  const role = (session as { role?: RoleName | null } | null)?.role;
  const permissions = (session as { permissions?: Partial<ModulePermissions> } | null)?.permissions;
  const canSeeAgency = hasPermission(role, permissions, "agency");

  useEffect(() => {
    if (!open) return;
    if (!orgs) void load();
    const onDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, orgs, load]);

  const close = () => {
    setOpen(false);
    setCreating(false);
    setName("");
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      rootRef.current?.querySelector<HTMLButtonElement>("[data-trigger]")?.focus();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? [])];
    if (!items.length) return;
    event.preventDefault();
    const index = items.findIndex((el) => el === document.activeElement);
    const next = event.key === "ArrowDown" ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
    items[next]?.focus();
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim()) void create(name.trim());
  };

  const panelPosition = collapsed ? "left-full top-0 ml-2 origin-top-left" : "left-0 top-full mt-1 w-[15.5rem] origin-top-left";

  return (
    <div ref={rootRef} className={collapsed ? "relative" : "relative min-w-0 flex-1"} onKeyDown={onKeyDown}>
      <button
        type="button"
        data-trigger
        onClick={() => (open ? close() : setOpen(true))}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Cuenta activa: ${title}. Cambiar de cuenta`}
        {...(collapsed ? tipProps : {})}
        className={
          collapsed
            ? "flex size-11 shrink-0 items-center justify-center rounded-control text-text-secondary-strong outline-none transition-colors duration-150 hover:bg-nav-hover focus-visible:ring-2 focus-visible:ring-focus motion-reduce:transition-none"
            : "group flex min-h-11 w-full min-w-0 items-center gap-2.5 rounded-control px-2 outline-none transition-colors duration-150 hover:bg-nav-hover focus-visible:ring-2 focus-visible:ring-focus motion-reduce:transition-none"
        }
      >
        <OrgMark brandColor={current?.brandColor ?? null} brandIcon={current?.brandIcon ?? null} name={title} size={collapsed ? 28 : 24} />
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-text-primary">{title}</span>
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              size={14}
              aria-hidden="true"
              className={`shrink-0 text-text-secondary transition-transform duration-150 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
            />
          </>
        )}
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Cuentas"
          className={`crm-floating-menu crm-menu-enter absolute z-[80] overflow-hidden rounded-surface border border-line bg-surface-elevated p-1 ${panelPosition}`}
        >
          <p className="px-2 pb-1 pt-2 text-xs font-medium text-text-secondary">Cuentas</p>
          <div className="max-h-64 overflow-y-auto">
            {!orgs && !error && <p className="px-2 py-3 text-sm text-text-secondary" role="status">Cargando…</p>}
            {(orgs ?? []).map((org) => (
              <button
                key={org.id}
                type="button"
                role="menuitem"
                disabled={busy}
                onClick={() => (org.current ? close() : void switchTo(org.id))}
                className={ITEM}
              >
                <OrgMark brandColor={org.brandColor} brandIcon={org.brandIcon} name={org.name} size={24} />
                <span className="min-w-0 flex-1 truncate">{org.name}</span>
                {org.current && <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} aria-hidden="true" className="shrink-0 text-action-primary" />}
              </button>
            ))}
          </div>

          <div className="mt-1 border-t border-line pt-1">
            <Link href="/" role="menuitem" onClick={() => { close(); onNavigate?.(); }} className={ITEM}>
              <HugeiconsIcon icon={Home01Icon} size={16} aria-hidden="true" className="ml-1 shrink-0 text-text-secondary" />
              Ir a Inicio
            </Link>
            {canSeeAgency && (
              <Link href="/clientes" role="menuitem" onClick={() => { close(); onNavigate?.(); }} className={ITEM}>
                <HugeiconsIcon icon={UserMultipleIcon} size={16} aria-hidden="true" className="ml-1 shrink-0 text-text-secondary" />
                Panel de clientes
              </Link>
            )}
            {creating ? (
              <form onSubmit={submit} className="flex items-center gap-1 px-1 py-1">
                <label className="sr-only" htmlFor="new-org-name">Nombre de la nueva sub-cuenta</label>
                <input
                  id="new-org-name"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre del cliente"
                  maxLength={120}
                  className="min-h-11 min-w-0 flex-1 rounded-control bg-nav-hover px-2 text-sm text-text-primary outline-none placeholder:text-text-placeholder focus-visible:ring-2 focus-visible:ring-focus"
                />
                <button type="submit" disabled={busy || !name.trim()} className="min-h-11 rounded-control px-3 text-sm font-semibold text-action-primary outline-none hover:bg-nav-hover focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50">
                  {busy ? "Creando…" : "Crear"}
                </button>
              </form>
            ) : (
              <button type="button" role="menuitem" onClick={() => setCreating(true)} className={ITEM}>
                <HugeiconsIcon icon={Add01Icon} size={16} aria-hidden="true" className="ml-1 shrink-0 text-text-secondary" />
                Nueva sub-cuenta
              </button>
            )}
          </div>
          {error && <p role="alert" className="px-2 py-2 text-xs text-danger">{error}</p>}
        </div>
      )}
    </div>
  );
}
