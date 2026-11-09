"use client";

// Disparador y menú de cuenta del shell (marco claro, escalera de acento).
// Se usa en la barra superior (abre hacia abajo) y en el pie de la sidebar (abre hacia arriba).
// Teclado: Intro/Espacio/↓ abre y enfoca el primer elemento; ↑/↓ recorren; Inicio/Fin saltan;
// Esc cierra y devuelve el foco al disparador; Tab cierra.

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AiChatIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  Logout01Icon,
  PaintBoardIcon,
  Settings01Icon,
  Tick02Icon,
  UserCircleIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { canManageTeam, hasPermission, type ModulePermissions, type RoleName } from "@/src/lib/permissions";
import { userAvatarSrc } from "@/src/lib/user-sexo";
import { useCrmTheme } from "@/src/context/CrmThemeContext";

const ROLE_LABEL: Record<RoleName, string> = {
  OWNER: "Propietario",
  ADMIN: "Admin",
  MEMBER: "Miembro",
};

export function roleLabel(role: RoleName | null | undefined): string | null {
  return role ? ROLE_LABEL[role] ?? null : null;
}

/** Iniciales estables del nombre (máx. 2), para cuando no hay imagen. */
export function initialsFor(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function AccountAvatar({ size, name, src }: { size: 20 | 28 | 32 | 40; name: string; src: string | null }) {
  const [failed, setFailed] = useState(false);
  const box = size === 20 ? "size-5" : size === 28 ? "size-7" : size === 32 ? "size-8" : "size-10";
  if (!src || failed) {
    return (
      <span
        aria-hidden="true"
        className={`${box} flex shrink-0 items-center justify-center rounded-full bg-nav-active text-xs font-semibold text-[var(--nav-active-ink)]`}
      >
        {initialsFor(name)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={`${box} shrink-0 rounded-full object-cover`}
    />
  );
}

type AccountMenuProps = {
  /** "down" bajo el disparador (barra superior); "up" sobre él (pie de la sidebar). */
  placement?: "down" | "up";
  /** Muestra nombre y rol junto al avatar: "always", desde xl ("wide") o nunca ("never"). */
  identity?: "always" | "wide" | "never";
  /** Se llama al elegir un destino o cerrar sesión (p. ej. cierra el panel móvil). */
  onNavigate?: () => void;
  /** Notifica al padre cuando el menú se abre (para cerrar otros menús de la barra). */
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

const ITEM =
  "flex min-h-11 w-full items-center gap-3 rounded-control px-3 text-left text-sm text-text-primary outline-none transition-colors duration-150 hover:bg-nav-hover focus-visible:bg-nav-hover focus-visible:ring-2 focus-visible:ring-focus motion-reduce:transition-none lg:min-h-9";

export default function AccountMenu({
  placement = "down",
  identity = "wide",
  onNavigate,
  onOpenChange,
  className = "",
}: AccountMenuProps) {
  const { data: session, status } = useSession();
  const { themeId, themes, selectTheme } = useCrmTheme();
  const [open, setOpenState] = useState(false);
  const [themesOpen, setThemesOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const focusFirstRef = useRef<"first" | "last" | null>(null);
  const menuId = useId();
  const themesId = useId();

  const name = session?.user?.name || "Tu cuenta";
  const email = session?.user?.email || "";
  const role = session?.role as RoleName | undefined;
  const permissions = session?.permissions as ModulePermissions | undefined;
  const roleText = roleLabel(role);
  const avatarSrc = session?.user ? userAvatarSrc(session.user.sexo) : null;
  const showTeam = canManageTeam(role);
  const canSeeSettings = hasPermission(role, permissions, "settings");
  const loading = status === "loading";

  const setOpen = useCallback(
    (next: boolean) => {
      setOpenState(next);
      if (!next) setThemesOpen(false);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );

  const menuItems = () =>
    Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? []).filter(
      (el) => el.getClientRects().length > 0,
    );

  // Al abrir, enfoca el primer (o último) elemento.
  useEffect(() => {
    if (!open || !focusFirstRef.current) return;
    const items = menuItems();
    const target = focusFirstRef.current === "last" ? items[items.length - 1] : items[0];
    focusFirstRef.current = null;
    target?.focus();
  }, [open]);

  // Clic fuera cierra.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, setOpen]);

  const closeAndReturnFocus = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const choose = () => {
    setOpen(false);
    onNavigate?.();
  };

  const handleSignOut = () => {
    setOpen(false);
    onNavigate?.();
    void signOut();
  };

  const onTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      focusFirstRef.current = event.key === "ArrowUp" ? "last" : "first";
      setOpen(true);
    }
  };

  const onMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const items = menuItems();
    const index = items.indexOf(document.activeElement as HTMLElement);
    switch (event.key) {
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        closeAndReturnFocus();
        return;
      case "Tab":
        setOpen(false);
        return;
      case "ArrowDown":
        event.preventDefault();
        items[(index + 1) % items.length]?.focus();
        return;
      case "ArrowUp":
        event.preventDefault();
        items[(index - 1 + items.length) % items.length]?.focus();
        return;
      case "Home":
        event.preventDefault();
        items[0]?.focus();
        return;
      case "End":
        event.preventDefault();
        items[items.length - 1]?.focus();
        return;
    }
  };

  const identityClass = identity === "always" ? "flex" : identity === "wide" ? "hidden xl:flex" : "hidden";
  const placementClass =
    placement === "up" ? "bottom-full left-0 mb-2 origin-bottom-left" : "right-0 top-full mt-2 origin-top-right";

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Cuenta: ${name}${roleText ? `, ${roleText}` : ""}`}
        onClick={() => {
          focusFirstRef.current = null;
          setOpen(!open);
        }}
        onKeyDown={onTriggerKeyDown}
        data-account-trigger
        className={`group flex min-h-11 min-w-11 items-center gap-2 rounded-control px-1.5 text-left outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface-sidebar motion-reduce:transition-none ${
          identity === "always" ? "w-full" : ""
        } ${open ? "border border-line bg-nav-active" : "border border-transparent hover:border-line hover:bg-nav-hover"}`}
      >
        {loading ? (
          <span aria-hidden="true" className={`${identity === "always" ? "size-8" : "size-7"} shrink-0 rounded-full bg-line`} />
        ) : (
          <AccountAvatar size={identity === "always" ? 32 : 28} name={name} src={avatarSrc} />
        )}
        <span className={`${identityClass} min-w-0 flex-1 flex-col leading-tight`}>
          {loading ? (
            <>
              <span aria-hidden="true" className="my-0.5 h-3.5 w-24 rounded-sm bg-line" />
              <span aria-hidden="true" className="my-0.5 h-3 w-14 rounded-sm bg-line" />
            </>
          ) : (
            <>
              <span className="max-w-40 truncate text-sm font-medium text-text-primary">{name}</span>
              {roleText && <span className="truncate text-xs text-text-secondary-strong">{roleText}</span>}
            </>
          )}
        </span>
        {identity !== "never" && (
          <HugeiconsIcon
          icon={placement === "up" ? ArrowUp01Icon : ArrowDown01Icon}
          size={14}
          aria-hidden="true"
          className={`shrink-0 text-text-secondary-strong transition-transform duration-150 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        />
        )}
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Cuenta"
          onKeyDown={onMenuKeyDown}
          data-account-menu
          className={`crm-floating-menu crm-menu-enter absolute z-[80] max-h-[calc(100dvh-5rem)] w-[280px] max-w-[calc(100vw-24px)] overflow-y-auto rounded-surface border border-line bg-surface-elevated p-1.5 ${placementClass}`}
        >
          <div className="flex items-center gap-3 px-2.5 pb-2.5 pt-2">
            <AccountAvatar size={40} name={name} src={avatarSrc} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-text-primary">{name}</p>
              {email && <p className="truncate text-xs text-text-secondary">{email}</p>}
            </div>
            {roleText && (
              <span className="shrink-0 whitespace-nowrap rounded-full bg-surface-sidebar px-2 py-0.5 text-xs font-medium text-text-secondary-strong">
                {roleText}
              </span>
            )}
          </div>
          <div className="my-1 h-px bg-line" role="separator" />

          <Link href="/profile" role="menuitem" onClick={choose} className={ITEM}>
            <HugeiconsIcon icon={UserCircleIcon} size={16} aria-hidden="true" className="text-text-secondary" />
            Perfil
          </Link>
          {showTeam && (
            <Link href="/settings/equipo" role="menuitem" onClick={choose} className={ITEM}>
              <HugeiconsIcon icon={UserGroupIcon} size={16} aria-hidden="true" className="text-text-secondary" />
              Equipo
            </Link>
          )}
          {canSeeSettings && (
            <>
              <Link href="/settings" role="menuitem" onClick={choose} className={ITEM}>
                <HugeiconsIcon icon={Settings01Icon} size={16} aria-hidden="true" className="text-text-secondary" />
                Ajustes
              </Link>
              <Link href="/settings/ai-models" role="menuitem" onClick={choose} className={ITEM}>
                <HugeiconsIcon icon={AiChatIcon} size={16} aria-hidden="true" className="text-text-secondary" />
                Modelos de IA
              </Link>
            </>
          )}

          <button
            type="button"
            role="menuitem"
            aria-expanded={themesOpen}
            aria-controls={themesId}
            onClick={() => setThemesOpen((v) => !v)}
            className={`${ITEM} justify-between`}
          >
            <span className="flex items-center gap-3">
              <HugeiconsIcon icon={PaintBoardIcon} size={16} aria-hidden="true" className="text-text-secondary" />
              Tema
            </span>
            <span className="flex min-w-0 items-center gap-1.5 text-xs text-text-secondary">
              <span className="truncate">{themes.find((t) => t.id === themeId)?.label}</span>
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                size={14}
                aria-hidden="true"
                className={`shrink-0 transition-transform duration-150 motion-reduce:transition-none ${themesOpen ? "rotate-180" : ""}`}
              />
            </span>
          </button>
          {themesOpen && (
            <div id={themesId} role="group" aria-label="Tema" className="max-h-56 overflow-y-auto pl-4">
              {themes.map((option) => {
                const selected = option.id === themeId;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={selected}
                    onClick={() => selectTheme(option.id)}
                    className={`${ITEM} justify-between ${selected ? "font-semibold" : ""}`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className="size-3 shrink-0 rounded-full border border-line"
                        style={{ backgroundColor: option.tokens.actionPrimary }}
                      />
                      <span className="truncate">{option.label}</span>
                    </span>
                    {selected && <HugeiconsIcon icon={Tick02Icon} size={14} aria-hidden="true" className="shrink-0 text-[var(--nav-active-ink)]" />}
                  </button>
                );
              })}
            </div>
          )}

          <div className="my-1 h-px bg-line" role="separator" />
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            data-sign-out
            className={`${ITEM} text-danger hover:bg-danger-soft focus-visible:bg-danger-soft`}
          >
            <HugeiconsIcon icon={Logout01Icon} size={16} aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
