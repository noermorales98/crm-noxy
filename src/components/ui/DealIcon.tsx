"use client";

import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserIcon,
  Target01Icon,
  Rocket01Icon,
  Briefcase01Icon,
  Building04Icon,
  Store01Icon,
  ShoppingBag01Icon,
  Home01Icon,
  Car01Icon,
  Restaurant01Icon,
  Hospital01Icon,
  GraduationScrollIcon,
  Camera01Icon,
  Idea01Icon,
  Megaphone01Icon,
  StarIcon,
  FavouriteIcon,
  Globe02Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "./cn";
import { DEAL_ICON_KEYS, DEAL_ICON_LABELS, DEFAULT_DEAL_ICON, type DealIconKey } from "@/src/lib/deal-icons";

const ICONS: Record<DealIconKey, typeof UserIcon> = {
  user: UserIcon,
  target: Target01Icon,
  rocket: Rocket01Icon,
  briefcase: Briefcase01Icon,
  building: Building04Icon,
  store: Store01Icon,
  shop: ShoppingBag01Icon,
  home: Home01Icon,
  car: Car01Icon,
  food: Restaurant01Icon,
  health: Hospital01Icon,
  education: GraduationScrollIcon,
  media: Camera01Icon,
  idea: Idea01Icon,
  megaphone: Megaphone01Icon,
  star: StarIcon,
  heart: FavouriteIcon,
  globe: Globe02Icon,
};

/** Clave guardada → clave válida (una desconocida o vacía cae en el icono por defecto). */
export function resolveDealIcon(value: string | null | undefined): DealIconKey {
  return value && value in ICONS ? (value as DealIconKey) : DEFAULT_DEAL_ICON;
}

const CIRCLE = "flex shrink-0 items-center justify-center rounded-full bg-nav-active text-[var(--nav-active-ink)]";

/** Círculo de un solo tono con el icono del lead. */
export function DealIconBadge({ icon, size = 48 }: { icon: string | null | undefined; size?: 40 | 48 }) {
  return (
    <span aria-hidden="true" className={cn(CIRCLE, size === 48 ? "size-12" : "size-10")}>
      <HugeiconsIcon icon={ICONS[resolveDealIcon(icon)]} size={size === 48 ? 22 : 18} />
    </span>
  );
}

type PickerProps = {
  value: string | null | undefined;
  onChange: (icon: DealIconKey) => void;
  disabled?: boolean;
};

/** El icono del lead es un botón: abre una cuadrícula de iconos circulares y guarda la elección al tocar uno. */
export function DealIconPicker({ value, onChange, disabled = false }: PickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = resolveDealIcon(value);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Icono del lead: ${DEAL_ICON_LABELS[current]}. Cambiar`}
        title="Cambiar icono"
        className="group/icon relative flex size-12 min-h-0! min-w-0! items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface-elevated disabled:opacity-60"
      >
        <DealIconBadge icon={current} />
        <span aria-hidden="true" className="absolute inset-0 rounded-full ring-1 ring-inset ring-transparent transition-colors group-hover/icon:ring-[var(--nav-active-ink)]/30" />
      </button>

      {open && (
        <div role="dialog" aria-label="Elegir icono" className="crm-floating-menu absolute left-0 top-full z-30 mt-2 w-64 rounded-surface border border-line bg-surface-elevated p-3">
          <p className="mb-2 text-xs text-text-secondary">Icono del lead</p>
          <div role="radiogroup" aria-label="Icono del lead" className="grid grid-cols-6 gap-1.5">
            {DEAL_ICON_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={current === key}
                aria-label={DEAL_ICON_LABELS[key]}
                title={DEAL_ICON_LABELS[key]}
                onClick={() => {
                  onChange(key);
                  setOpen(false);
                }}
                className={cn(
                  "flex size-9 min-h-0! min-w-0! items-center justify-center rounded-full border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus",
                  current === key
                    ? "border-[var(--nav-active-ink)] bg-nav-active text-[var(--nav-active-ink)]"
                    : "border-transparent text-text-secondary-strong hover:bg-nav-hover",
                )}
              >
                <HugeiconsIcon icon={ICONS[key]} size={17} aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
