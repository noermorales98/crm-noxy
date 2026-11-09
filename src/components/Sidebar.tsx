"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  BarChartIcon,
  Briefcase01Icon,
  GridViewIcon,
  Megaphone01Icon,
  Home01Icon,
  Search01Icon,
  SidebarLeftIcon,
  SidebarRightIcon,
} from "@hugeicons/core-free-icons";
import { useNotifications } from "@/src/context/NotificationContext";
import { useGlobalSearch } from "@/src/context/SearchContext";
import AccountMenu from "@/src/components/AccountMenu";
import NotificationsMenu from "@/src/components/NotificationsMenu";
import { AssistantNav } from "@/src/components/context-navs";
import { ContextContent } from "@/src/components/ContextContent";
import SettingsSidebar from "@/src/components/SettingsSidebar";
import { KbRootActions } from "@/src/components/kb/KbSidebarTree";
import { CountBadge, NAV_ICONS, NavLeaf, groupLabelClass } from "@/src/components/sidebar-parts";
import { play } from "cuelume";
import type { ModulePermissions, RoleName } from "@/src/lib/permissions";
import {
  MODE_STORAGE_KEY,
  SIDEBAR_COLLAPSED_STORAGE_KEY,
  activeNavHref,
  CONTEXT_OWNER_HREF,
  contextPanelFor,
  isCollapseShortcut,
  isSettingsRoute,
  modeHome,
  resolveMode,
  visibleModes,
  type NavEntry,
  type NavMode,
} from "@/src/lib/crm-navigation";

// ─── Sidebar por modos (marco claro · ronda 3) ─────────────────────────────────
// Ancho: 240px (w-60) desplegada, 64px (w-16) como riel. Arriba, la marca con la búsqueda (⌘K) y las
// notificaciones; debajo, un selector de 3 modos (Trabajo, Ventas, Espacios) y la lista plana del modo
// elegido: sin ramas desplegables. Abajo, la cuenta (con Ajustes). Las listas propias de Correo, Docs,
// Bóveda y Contenido se integran en esta misma sidebar, bajo la lista del modo (sin segunda columna).

const MODE_ICONS: Record<NavMode, typeof Home01Icon> = {
  work: Briefcase01Icon,
  sales: BarChartIcon,
  spaces: GridViewIcon,
  content: Megaphone01Icon,
};

interface SidebarProps {
  variant?: "docked" | "floating" | "pinned";
  onNavigate?: () => void;
  /** Control a la derecha de la marca (en el asistente: fijar/soltar). */
  headerControl?: ReactNode;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Sin almacenamiento la preferencia dura la sesión.
  }
}

const ICON_BUTTON =
  "flex size-11 shrink-0 items-center justify-center rounded-control border border-transparent hover:border-line text-text-secondary-strong outline-none transition-colors duration-150 hover:bg-nav-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-focus motion-reduce:transition-none";

/** En Ajustes y Perfil la sidebar principal no aparece: manda la propia de Ajustes. */
export default function Sidebar(props: SidebarProps) {
  const pathname = usePathname() ?? "/";
  return isSettingsRoute(pathname) ? <SettingsSidebar variant={props.variant} onNavigate={props.onNavigate} /> : <MainSidebar {...props} />;
}

function MainSidebar({ variant = "docked", onNavigate, headerControl }: SidebarProps) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { data: session } = useSession();
  const { notifications } = useNotifications();
  const { openSearch } = useGlobalSearch();
  const asideRef = useRef<HTMLElement>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [tip, setTip] = useState<{ label: string; top: number; left: number } | null>(null);

  const unreadEmailCount = notifications.filter((n) => n.type === "NEW_EMAIL" && !n.isRead).length;
  const role = session?.role as RoleName | undefined;
  const permissions = session?.permissions as ModulePermissions | undefined;
  const modes = visibleModes(role, permissions);

  // ── Modo: lo manda la ruta; en rutas sin modo (Ajustes, Perfil), el último elegido ──
  const [stored, setStored] = useState<string | null>(null);
  // La elección manual vale solo para la ruta en que se hizo; al navegar manda de nuevo la ruta.
  const [picked, setPicked] = useState<{ mode: NavMode; path: string } | null>(null);
  useEffect(() => {
    setStored(readStorage(MODE_STORAGE_KEY));
  }, []);
  const wanted = picked && picked.path === pathname ? picked.mode : resolveMode(pathname, stored);
  const activeMode = modes.find((mode) => mode.key === wanted)?.key ?? modes[0]?.key ?? null;
  const groups = modes.find((mode) => mode.key === activeMode)?.groups ?? [];
  // Elegir un modo abre su primera pantalla; la ruta nueva confirma el modo.
  const pickMode = (mode: NavMode) => {
    setPicked({ mode, path: pathname });
    setStored(mode);
    writeStorage(MODE_STORAGE_KEY, mode);
    const target = modeHome(modes.find((candidate) => candidate.key === mode) ?? { key: mode, label: "", groups: [] });
    if (target && target !== pathname) router.push(target);
  };

  // El destino más específico de todos los modos marca la fila activa.
  const allHrefs = modes.flatMap((mode) => mode.groups.flatMap((group) => group.items.map((item) => item.href)));
  // Rutas de un espacio que no cuelgan de su href (campañas, clientes de contenido) marcan su destino.
  const spaceFallback = contextPanelFor(pathname) === "mail" ? "/emails" : contextPanelFor(pathname) === "content" ? "/contenido/general" : null;
  const rawLeaf = activeNavHref(pathname, allHrefs);
  // Las páginas de un cliente de contenido pertenecen al calendario, no al resumen.
  const contentCalendarRoute = rawLeaf === "/contenido" && pathname.startsWith("/contenido/") && !/^\/contenido\/(clientes|recordatorios)(\/|$)/.test(pathname);
  const activeLeaf = contentCalendarRoute ? "/contenido/general" : (rawLeaf ?? (spaceFallback && allHrefs.includes(spaceFallback) ? spaceFallback : null));

  // ── Riel (solo la sidebar acoplada de escritorio) ─────────────────────────────
  const canCollapse = variant === "docked";
  const [collapsedPref, setCollapsedPref] = useState(false);
  const collapsed = canCollapse && collapsedPref;

  useEffect(() => {
    if (canCollapse) setCollapsedPref(readStorage(SIDEBAR_COLLAPSED_STORAGE_KEY) === "1");
  }, [canCollapse]);

  const toggleCollapsed = useCallback(() => {
    setCollapsedPref((value) => {
      writeStorage(SIDEBAR_COLLAPSED_STORAGE_KEY, value ? "0" : "1");
      return !value;
    });
    setTip(null);
    setNotifOpen(false);
  }, []);

  useEffect(() => {
    if (!canCollapse) return;
    const onKey = (event: KeyboardEvent) => {
      if (
        isCollapseShortcut({
          key: event.key,
          metaKey: event.metaKey,
          ctrlKey: event.ctrlKey,
          altKey: event.altKey,
          shiftKey: event.shiftKey,
          editable: isEditableTarget(event.target),
        })
      ) {
        event.preventDefault();
        toggleCollapsed();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canCollapse, toggleCollapsed]);

  // ── Tooltip del riel ─────────────────────────────────────────────────────────
  const showTip = (label: string, el: HTMLElement) => {
    if (!collapsed) return;
    const rect = el.getBoundingClientRect();
    setTip({ label, top: rect.top + rect.height / 2, left: rect.right + 8 });
  };
  const hideTip = () => setTip(null);
  const tipProps = (label: string) => ({
    onPointerEnter: (e: React.PointerEvent<HTMLElement>) => showTip(label, e.currentTarget),
    onPointerLeave: hideTip,
    onFocus: (e: React.FocusEvent<HTMLElement>) => showTip(label, e.currentTarget),
    onBlur: hideTip,
  });

  // Elegir un destino cierra el panel flotante (móvil o vistazo del asistente).
  const chooseDestination = () => {
    setTip(null);
    onNavigate?.();
  };

  // Sonido al pasar por los enlaces de navegación (solo ratón, solo esta columna).
  useEffect(() => {
    const container = asideRef.current;
    if (!container) return;
    let lastLink: HTMLElement | null = null;
    function handlePointerOver(e: PointerEvent) {
      if (e.pointerType !== "mouse") return;
      const link = (e.target as HTMLElement).closest("a");
      if (link && link !== lastLink && container!.contains(link)) {
        lastLink = link;
        play("tick");
      } else if (!link) {
        lastLink = null;
      }
    }
    function handlePointerOut(e: PointerEvent) {
      const link = (e.target as HTMLElement).closest("a");
      if (link && link === lastLink) {
        const related = e.relatedTarget as HTMLElement | null;
        if (!related || !link.contains(related)) lastLink = null;
      }
    }
    container.addEventListener("pointerover", handlePointerOver);
    container.addEventListener("pointerout", handlePointerOut);
    return () => {
      container.removeEventListener("pointerover", handlePointerOver);
      container.removeEventListener("pointerout", handlePointerOut);
    };
  }, []);

  // ── Selector de modos: ← → cambian de modo (tablist con tabindex móvil) ──────
  const onTabsKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key) || modes.length === 0) return;
    event.preventDefault();
    const index = Math.max(0, modes.findIndex((mode) => mode.key === activeMode));
    const next =
      event.key === "Home" ? 0 : event.key === "End" ? modes.length - 1 : (index + (event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1) + modes.length) % modes.length;
    pickMode(modes[next].key);
    event.currentTarget.querySelectorAll<HTMLElement>("[role=tab]")[next]?.focus();
  };

  const shellClass =
    variant === "floating"
      ? "flex h-full w-full flex-col rounded-surface border border-line bg-surface-sidebar"
      : variant === "pinned"
        ? "flex h-full w-full flex-col bg-surface-sidebar"
        : `crm-sidebar-width flex h-full shrink-0 flex-col border-r border-line bg-surface-sidebar ${collapsed ? "w-16" : "w-60"}`;

  const badgeFor = (item: NavEntry) => (item.kind !== "area" && item.badge === "unread-mail" ? unreadEmailCount : 0);

  const collapseButton = canCollapse ? (
    <button
      type="button"
      onClick={toggleCollapsed}
      aria-label={collapsed ? "Expandir barra lateral" : "Contraer barra lateral"}
      aria-expanded={!collapsed}
      title={collapsed ? "Expandir · ⌘B" : "Contraer · ⌘B"}
      {...tipProps("Expandir · ⌘B")}
      className={ICON_BUTTON}
    >
      <HugeiconsIcon icon={collapsed ? SidebarRightIcon : SidebarLeftIcon} size={18} aria-hidden="true" />
    </button>
  ) : null;

  const searchButton = (
    <button type="button" onClick={() => { onNavigate?.(); openSearch(); }} aria-label="Buscar" title="Buscar · ⌘K" data-sidebar-search {...tipProps("Buscar · ⌘K")} className={ICON_BUTTON}>
      <HugeiconsIcon icon={Search01Icon} size={18} aria-hidden="true" />
    </button>
  );

  // Lista de los destinos del modo, o su icono en el riel.
  const itemRow = (item: NavEntry) => {
    const badge = badgeFor(item);
    const isActive = item.href === activeLeaf;
    const icon = NAV_ICONS[item.href] ?? Home01Icon;
    if (collapsed) {
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={chooseDestination}
          aria-label={badge > 0 ? `${item.label}, ${badge} sin leer` : item.label}
          aria-current={isActive ? "page" : undefined}
          {...tipProps(item.label)}
          className={`relative flex size-11 items-center justify-center rounded-control outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-focus motion-reduce:transition-none ${
            isActive ? "border border-line bg-nav-active text-[var(--nav-active-ink)]" : "border border-transparent text-text-secondary-strong hover:bg-nav-hover hover:text-text-primary"
          }`}
        >
          <HugeiconsIcon icon={icon} size={18} aria-hidden="true" />
          {badge > 0 && (
            <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-action-primary px-1 text-xs font-semibold leading-none tabular-nums text-action-primary-foreground">
              {badge > 9 ? "9+" : badge}
            </span>
          )}
        </Link>
      );
    }
    return (
      <NavLeaf
        key={item.href}
        href={item.href}
        label={item.label}
        icon={icon}
        isActive={isActive}
        onChoose={chooseDestination}
        trailing={badge > 0 ? <CountBadge count={badge} label={`${badge} correos sin leer`} /> : undefined}
      />
    );
  };

  // Debajo de la lista del modo, integrada en la misma sidebar (no hay segunda columna).
  const section = contextPanelFor(pathname);
  const onAssistant = pathname === "/assistant" || pathname.startsWith("/assistant/");
  const ownsSection = (href: string) => (onAssistant ? href === "/assistant" : section !== null && href === CONTEXT_OWNER_HREF[section]);
  const lowerSection = onAssistant ? <AssistantNav /> : section ? <ContextContent section={section} onNavigate={onNavigate} /> : null;

  return (
    <>
      <aside ref={asideRef} aria-label="Barra lateral principal" data-sidebar-collapsed={collapsed || undefined} className={shellClass}>
        {/* ── Marca, búsqueda y notificaciones ───────────────────────────────── */}
        {collapsed ? (
          <div className="flex shrink-0 flex-col items-center gap-0.5 px-2 pb-1 pt-2">
            <Link href="/" onClick={chooseDestination} aria-label="Noxy, ir a Inicio" {...tipProps("Inicio")} className={ICON_BUTTON}>
              {/* Isotipo oficial (public/Isotipo_Azul.svg), sin cuadro de fondo. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/Isotipo_Azul.svg" alt="" width={24} height={18} className="h-[18px] w-6 shrink-0" />
            </Link>
            {searchButton}
            <NotificationsMenu open={notifOpen} onOpenChange={setNotifOpen} placement="right" onNavigate={onNavigate} />
          </div>
        ) : (
          <div className="flex h-14 shrink-0 items-center gap-0.5 pl-3 pr-2">
            <Link
              href="/"
              onClick={chooseDestination}
              aria-label="Noxy, ir a Inicio"
              className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-control px-2 outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/Isotipo_Azul.svg" alt="" width={24} height={18} className="h-[18px] w-6 shrink-0" />
              <span className="truncate text-sm font-semibold text-text-primary">Noxy</span>
            </Link>
            {searchButton}
            <NotificationsMenu open={notifOpen} onOpenChange={setNotifOpen} placement="below" onNavigate={onNavigate} />
            {headerControl}
          </div>
        )}

        {/* ── Selector de modos: tres iconos circulares, sin texto ───────────── */}
        {modes.length > 1 && (
          <div
            role="tablist"
            aria-label="Secciones"
            aria-orientation={collapsed ? "vertical" : "horizontal"}
            onKeyDown={onTabsKeyDown}
            className={`flex shrink-0 items-center gap-1.5 pb-2 pt-1 ${collapsed ? "flex-col px-2" : "px-4"}`}
          >
            {modes.map((mode) => {
              const selected = mode.key === activeMode;
              return (
                <button
                  key={mode.key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-label={mode.label}
                  title={mode.label}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => pickMode(mode.key)}
                  {...tipProps(mode.label)}
                  className={`flex size-11 shrink-0 items-center justify-center rounded-full outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-focus motion-reduce:transition-none lg:size-9 ${
                    selected ? "border border-line bg-nav-active text-[var(--nav-active-ink)]" : "border border-transparent text-text-secondary-strong hover:bg-nav-hover hover:text-text-primary"
                  }`}
                >
                  <HugeiconsIcon icon={MODE_ICONS[mode.key]} size={18} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        )}

        {/* ── Lista plana del modo ──────────────────────────────────────────── */}
        <nav
          aria-label="Destinos"
          className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pb-3 ${collapsed ? "flex flex-col items-center gap-0.5 px-2 pt-2" : "px-3"}`}
        >
          {groups.map((group, index) =>
            collapsed ? (
              <div key={group.label} className={`flex flex-col items-center gap-0.5 ${index > 0 ? "mt-3 border-t border-line pt-3" : ""}`}>
                {group.items.map(itemRow)}
              </div>
            ) : (
              <div key={group.label}>
                {index > 0 && <p className={groupLabelClass}>{group.label}</p>}
                {group.items.map((item) => (
                  <Fragment key={item.href}>
                    {item.href === "/kb" && !collapsed ? (
                      <div className="relative">
                        {itemRow(item)}
                        <div className="absolute right-1 top-1/2 -translate-y-1/2">
                          <KbRootActions onNavigate={onNavigate} />
                        </div>
                      </div>
                    ) : (
                      itemRow(item)
                    )}
                    {/* La lista propia se abre justo debajo de su elemento y se va al cambiar de sección. */}
                    {lowerSection && ownsSection(item.href) && (
                      <div className="my-1 border-y border-line py-1">{lowerSection}</div>
                    )}
                  </Fragment>
                ))}
              </div>
            ),
          )}
        </nav>

        {/* ── Pie: cuenta (Ajustes vive en su menú) ────────────────────────────────────────── */}
        <div className={`shrink-0 border-t border-line py-2 ${collapsed ? "flex flex-col items-center gap-0.5 px-2" : "px-3"}`}>
          <div className={collapsed ? "flex flex-col items-center gap-0.5" : "flex items-center gap-1"}>
            <AccountMenu
              placement="up"
              identity={collapsed ? "never" : "always"}
              onNavigate={onNavigate}
              onOpenChange={(open) => open && setNotifOpen(false)}
              className={collapsed ? "" : "min-w-0 flex-1"}
            />
            {collapseButton}
          </div>
        </div>
      </aside>

      {collapsed && tip && (
        <div
          role="tooltip"
          style={{ top: tip.top, left: tip.left }}
          className="pointer-events-none fixed z-[90] -translate-y-1/2 whitespace-nowrap rounded-control bg-brand-obsidian px-2 py-1 text-xs font-medium text-white"
        >
          {tip.label}
        </div>
      )}
    </>
  );
}
