"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Home01Icon, Building04Icon, UserMultipleIcon, Task01Icon, InboxIcon, BrowserIcon, Calendar01Icon, Clock01Icon, CalendarCheckIn01Icon, BarChartIcon, FolderKanbanIcon, Book01Icon, Settings01Icon, AiChatIcon, Invoice01Icon, LockPasswordIcon, MegaphoneIcon, ClockIcon } from "@hugeicons/core-free-icons";
import { NAV_ITEM_ACTIVE } from "@/src/lib/crm-navigation";

// ─── Sidebar en árbol (marco claro · escalera de acento) ───────────────────────
// Ancho: 240px (w-60) desplegada, 64px (w-16) como riel. En 1440px: 240 + 1200 de hoja = 1440;
// la hoja deja 24px a cada lado (1152px de contenido). Con riel: 64 + 1376 = 1440 (1328px de contenido).
// Cada fila tiene una caja de 44px (objetivo táctil); la pastilla visible es de 36px, dibujada como
// pseudo-elemento ::before, para que el ritmo se lea como el de la hoja de estilo.

export const ICON_SIZE = 16;

/** Fila del árbol: caja de 44px, pastilla visible de 36px en ::before (fondo de reposo, hover y activo). */
export const ROW =
  "group/row relative isolate flex min-h-11 w-full items-center gap-2.5 px-3 text-left text-sm outline-none transition-colors duration-150 motion-reduce:transition-none before:absolute before:inset-x-0 before:inset-y-1 before:-z-10 before:rounded-control before:border before:border-transparent before:transition-colors before:duration-150 focus-visible:before:ring-2 focus-visible:before:ring-focus motion-reduce:before:transition-none";
export const ROW_IDLE = "text-text-primary hover:before:bg-nav-hover";
export const ICON_IDLE = "shrink-0 text-text-secondary-strong";

export function rowClass(isActive: boolean, extra = "") {
  return `${ROW} ${isActive ? NAV_ITEM_ACTIVE : ROW_IDLE} ${extra}`.trim();
}

/** Compatibilidad con los submenús de Correo, Contenido y Asistente. */
export function navItemClass(isActive: boolean, extra = "") {
  return rowClass(isActive, extra);
}

export const sectionLabelClass = "px-3 pb-1 pt-4 text-xs font-medium text-text-secondary-strong";
export const groupLabelClass = "px-3 pb-1 pt-5 text-xs font-medium text-text-secondary-strong";

/** Botón secundario dentro de una rama (Redactar, Nuevo…): blanco, borde de control. */
export const branchActionClass =
  "relative isolate flex min-h-11 w-full items-center gap-2 px-3 text-sm font-medium text-text-primary outline-none before:absolute before:inset-x-0 before:inset-y-1 before:-z-10 before:rounded-control before:border before:border-control before:bg-surface-elevated before:transition-colors hover:before:bg-nav-hover focus-visible:before:ring-2 focus-visible:before:ring-focus";

export const LIVE_LIST_CAP = 5;


/** Icono de cada destino (el modelo de navegación no conoce React). */
export const NAV_ICONS: Record<string, typeof Home01Icon> = {
  "/": Home01Icon,
  "/companies": Building04Icon,
  "/contacts": UserMultipleIcon,
  "/tasks": Task01Icon,
  "/projects": FolderKanbanIcon,
  "/pipeline": BarChartIcon,
  "/pipeline/clientes": UserMultipleIcon,
  "/pipeline/historial": ClockIcon,
  "/forms": BrowserIcon,
  "/cotizaciones": Invoice01Icon,
  "/appointment-types": Calendar01Icon,
  "/availability": Clock01Icon,
  "/appointments": CalendarCheckIn01Icon,
  "/emails": InboxIcon,
  "/kb": Book01Icon,
  "/assistant": AiChatIcon,
  "/boveda": LockPasswordIcon,
  "/contenido/general": MegaphoneIcon,
  "/settings": Settings01Icon,
};

// ─── Piezas del árbol ──────────────────────────────────────────────────────────

export function CountBadge({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={label}
      className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-action-primary px-1.5 text-xs font-semibold tabular-nums text-action-primary-foreground"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function NavLeaf({
  href,
  label,
  icon,
  isActive,
  onChoose,
  trailing,
}: {
  href: string;
  label: string;
  icon: typeof Home01Icon;
  isActive: boolean;
  onChoose?: () => void;
  trailing?: ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onChoose}
     
      aria-current={isActive ? "page" : undefined}
      className={rowClass(isActive)}
    >
      <HugeiconsIcon icon={icon} size={ICON_SIZE} aria-hidden="true" className={isActive ? "shrink-0" : ICON_IDLE} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {trailing}
    </Link>
  );
}

/** Lista viva con tope: muestra 5 y «Ver todos (N)» despliega el resto en el sitio. */
export function CappedList<T>({ items, render, noun }: { items: readonly T[]; render: (item: T) => ReactNode; noun: string }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, LIVE_LIST_CAP);
  return (
    <>
      {shown.map(render)}
      {items.length > LIVE_LIST_CAP && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className={`${rowClass(false)} text-text-secondary-strong`}
        >
          <span className="pl-[26px]">{expanded ? "Ver menos" : `Ver ${noun} (${items.length})`}</span>
        </button>
      )}
    </>
  );
}
