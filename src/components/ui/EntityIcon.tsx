"use client";

import { useCallback, useSyncExternalStore } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Building04Icon,
  Briefcase01Icon,
  Store01Icon,
  Hospital01Icon,
  GraduationScrollIcon,
  Home01Icon,
  Rocket01Icon,
  ShoppingBag01Icon,
  Restaurant01Icon,
  Car01Icon,
  Camera01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "./cn";

// Iconos circulares de una sola tinta (tono de marca), sin colores por entidad.

export const COMPANY_ICONS = {
  building: Building04Icon,
  briefcase: Briefcase01Icon,
  store: Store01Icon,
  health: Hospital01Icon,
  education: GraduationScrollIcon,
  home: Home01Icon,
  startup: Rocket01Icon,
  shop: ShoppingBag01Icon,
  food: Restaurant01Icon,
  auto: Car01Icon,
  media: Camera01Icon,
} as const;

export type CompanyIconKey = keyof typeof COMPANY_ICONS;
export const COMPANY_ICON_LABELS: Record<CompanyIconKey, string> = {
  building: "Edificio",
  briefcase: "Negocios",
  store: "Tienda",
  health: "Salud",
  education: "Educación",
  home: "Inmuebles",
  startup: "Startup",
  shop: "Comercio",
  food: "Restaurante",
  auto: "Automotriz",
  media: "Medios",
};

const KEY = "noxy.company.icons";
const listeners = new Set<() => void>();

function readAll(): Record<string, CompanyIconKey> {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, CompanyIconKey>) : {};
  } catch {
    return {};
  }
}

let cache: string | null = null;
function snapshot(): string {
  if (typeof window === "undefined") return "{}";
  try {
    cache = window.localStorage.getItem(KEY) ?? "{}";
  } catch {
    cache = cache ?? "{}";
  }
  return cache;
}

/** Icono elegido por empresa, guardado en este navegador (no hay columna en la base de datos). */
export function useCompanyIcons() {
  const raw = useSyncExternalStore(
    (notify) => {
      listeners.add(notify);
      window.addEventListener("storage", notify);
      return () => {
        listeners.delete(notify);
        window.removeEventListener("storage", notify);
      };
    },
    snapshot,
    () => "{}",
  );
  const all = JSON.parse(raw) as Record<string, CompanyIconKey>;
  const iconFor = useCallback((id: string): CompanyIconKey => (all[id] && all[id] in COMPANY_ICONS ? all[id] : "building"), [all]);
  const setIcon = useCallback((id: string, icon: CompanyIconKey) => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ ...readAll(), [id]: icon }));
    } catch {
      // Sin almacenamiento la elección dura solo la sesión.
    }
    listeners.forEach((notify) => notify());
  }, []);
  return { iconFor, setIcon };
}

const CIRCLE = "flex shrink-0 items-center justify-center rounded-full bg-nav-active text-[var(--nav-active-ink)]";

export function CompanyAvatar({ icon = "building", size = 36 }: { icon?: CompanyIconKey; size?: 36 | 44 }) {
  return (
    <span aria-hidden="true" className={cn(CIRCLE, size === 36 ? "size-9" : "size-11")}>
      <HugeiconsIcon icon={COMPANY_ICONS[icon]} size={size === 36 ? 18 : 20} />
    </span>
  );
}

/** Contacto: un círculo de un solo tono y un icono de usuario monocromático. */
export function ContactAvatar() {
  return (
    <span aria-hidden="true" className={cn(CIRCLE, "size-9")}>
      <HugeiconsIcon icon={UserIcon} size={18} />
    </span>
  );
}

/** Selector de icono: cuadrícula de botones circulares con la selección marcada. */
export function CompanyIconPicker({ value, onChange }: { value: CompanyIconKey; onChange: (icon: CompanyIconKey) => void }) {
  return (
    <div role="radiogroup" aria-label="Icono de la empresa" className="flex flex-wrap gap-2">
      {(Object.keys(COMPANY_ICONS) as CompanyIconKey[]).map((key) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={value === key}
          aria-label={COMPANY_ICON_LABELS[key]}
          title={COMPANY_ICON_LABELS[key]}
          onClick={() => onChange(key)}
          className={cn(
            "flex size-11 items-center justify-center rounded-full border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus",
            value === key ? "border-[var(--nav-active-ink)] bg-nav-active text-[var(--nav-active-ink)]" : "border-line text-text-secondary-strong hover:bg-nav-hover",
          )}
        >
          <HugeiconsIcon icon={COMPANY_ICONS[key]} size={18} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
