"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowUp01Icon,
  ArrowUpDownIcon,
  SlidersHorizontalIcon,
} from "@hugeicons/core-free-icons";
import { useHeader, type HeaderAction } from "@/src/context/HeaderContext";

// Controles de la página (antes en la barra superior): volver, orden, filtros, botón principal y
// acciones. Los pinta PageHeader; las páginas sin PageHeader los llevan en PageBar.

const CONTROL =
  "flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-control px-3 text-sm font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-focus motion-reduce:transition-none lg:min-h-9 lg:min-w-9";
const CONTROL_IDLE = "text-text-secondary-strong hover:bg-nav-hover hover:text-text-primary";
const CONTROL_ON = "bg-nav-active text-[var(--nav-active-ink)]";
const MENU = "crm-floating-menu absolute z-[80] mt-2 rounded-surface border border-line bg-surface-elevated";

function useOutsideClose(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

/** Flecha «Regresar» de las pantallas de detalle. */
export function BackLink() {
  const { config } = useHeader();
  if (!config.backHref) return null;
  return (
    <Link
      href={config.backHref}
      aria-label="Regresar"
      title="Regresar"
      className="flex size-11 shrink-0 items-center justify-center rounded-control text-text-secondary-strong outline-none transition-colors hover:bg-nav-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-focus lg:size-9"
    >
      <HugeiconsIcon icon={ArrowLeft01Icon} size={16} aria-hidden="true" />
    </Link>
  );
}

function SortMenu() {
  const { config, sortField, sortOrder, setSort } = useHeader();
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  const options = config.sortOptions ?? [];
  if (options.length === 0) return null;
  const current = options.find((option) => option.value === sortField)?.label;
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`${CONTROL} ${sortField ? CONTROL_ON : CONTROL_IDLE}`}
      >
        <HugeiconsIcon icon={ArrowUpDownIcon} size={14} aria-hidden="true" />
        <span className="hidden items-center gap-1 sm:flex">
          {current ?? "Ordenar"}
          {current && <HugeiconsIcon icon={sortOrder === "asc" ? ArrowUp01Icon : ArrowDown01Icon} size={11} aria-hidden="true" />}
        </span>
        <span className="sr-only sm:hidden">Ordenar</span>
      </button>
      {open && (
        <div role="menu" className={`${MENU} right-0 w-48 py-1`}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="menuitem"
              onClick={() => {
                setSort(option.value);
                setOpen(false);
              }}
              className={`flex min-h-11 w-full items-center justify-between px-4 text-left text-sm transition-colors hover:bg-nav-hover lg:min-h-9 ${
                sortField === option.value ? "font-semibold text-text-primary" : "text-text-secondary-strong"
              }`}
            >
              {option.label}
              {sortField === option.value && <HugeiconsIcon icon={sortOrder === "asc" ? ArrowUp01Icon : ArrowDown01Icon} size={13} aria-hidden="true" />}
            </button>
          ))}
          {sortField && (
            <div className="mt-1 border-t border-line pt-1">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setSort("");
                  setOpen(false);
                }}
                className="min-h-11 w-full px-4 text-left text-sm text-text-secondary-strong hover:bg-nav-hover hover:text-text-primary lg:min-h-9"
              >
                Quitar orden
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FilterMenu() {
  const { config, activeFilters, setFilter } = useHeader();
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  const groups = config.filterGroups ?? [];
  if (groups.length === 0) return null;
  const count = Object.keys(activeFilters).length;
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`${CONTROL} ${count > 0 ? CONTROL_ON : CONTROL_IDLE}`}
      >
        <HugeiconsIcon icon={SlidersHorizontalIcon} size={14} aria-hidden="true" />
        <span className="hidden sm:inline">Filtros</span>
        <span className="sr-only sm:hidden">Filtros</span>
        {count > 0 && (
          <span className="flex size-4 items-center justify-center rounded-full bg-action-primary text-xs font-semibold tabular-nums text-action-primary-foreground">{count}</span>
        )}
      </button>
      {open && (
        <div role="dialog" aria-label="Filtros" className={`${MENU} right-0 flex w-60 flex-col gap-4 p-4`}>
          {groups.map((group) => (
            <label key={group.key} className="block">
              <span className="mb-1.5 block text-xs font-semibold text-text-secondary-strong">{group.label}</span>
              <select
                value={activeFilters[group.key] || ""}
                onChange={(event) => setFilter(group.key, event.target.value)}
                className="min-h-11 w-full rounded-control border border-line bg-surface-elevated px-3 text-sm lg:min-h-9"
              >
                <option value="">Todos</option>
                {group.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {count > 0 && (
            <button
              type="button"
              onClick={() => groups.forEach((group) => setFilter(group.key, ""))}
              className="min-h-11 text-left text-sm text-danger hover:underline lg:min-h-9"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ActionButton({ action }: { action: HeaderAction }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  const hide = action.hideOnMobile ? "max-sm:hidden" : "";
  const cls = `${CONTROL} disabled:opacity-50 ${action.active ? "bg-action-primary text-action-primary-foreground hover:opacity-90" : "border border-line bg-surface-elevated text-text-secondary-strong hover:bg-nav-hover hover:text-text-primary"}`;
  const icon = <HugeiconsIcon icon={action.icon} size={16} aria-hidden="true" className={action.spinning ? "animate-spin" : ""} />;

  if (action.menu?.length) {
    return (
      <div className={`relative ${hide}`} ref={ref}>
        <button type="button" onClick={() => setOpen((value) => !value)} disabled={action.disabled} aria-haspopup="menu" aria-expanded={open} aria-label={action.label} title={action.label} className={cls}>
          {icon}
        </button>
        {open && (
          <div role="menu" className={`${MENU} right-0 w-56 py-1`}>
            {action.menu.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  item.onClick();
                  setOpen(false);
                }}
                className="min-h-11 w-full px-4 text-left text-sm text-text-secondary-strong hover:bg-nav-hover hover:text-text-primary lg:min-h-9"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
  if (action.href) {
    return (
      <Link href={action.href} aria-label={action.label} title={action.label} className={`${cls} ${hide}`}>
        {icon}
      </Link>
    );
  }
  return (
    <button type="button" onClick={action.onClick} disabled={action.disabled} aria-label={action.label} title={action.label} className={`${cls} ${hide}`}>
      {icon}
    </button>
  );
}

/** ¿La pantalla declaró algún control (orden, filtros, botón principal o acciones)? */
export function useHasPageControls(): boolean {
  const { config } = useHeader();
  return Boolean(config.sortOptions?.length || config.filterGroups?.length || config.addButton || config.actions?.length);
}

/** Orden, filtros, acciones y botón principal declarados por la pantalla en HeaderContext. */
export default function PageControls() {
  const { config } = useHeader();
  if (!useHasPageControls()) return null;
  return (
    <div className="flex flex-wrap items-center gap-1 sm:gap-2" data-page-controls>
      <SortMenu />
      <FilterMenu />
      {config.actions?.map((action) => (
        <ActionButton key={action.key} action={action} />
      ))}
      {config.addButton && (
        <button
          type="button"
          onClick={config.addButton.onClick}
          className={`${CONTROL} bg-action-primary text-action-primary-foreground hover:opacity-90 ${config.addButton.hideOnMobile ? "max-sm:hidden" : ""}`}
        >
          <HugeiconsIcon icon={Add01Icon} size={15} aria-hidden="true" />
          {config.addButton.label}
        </button>
      )}
    </div>
  );
}
