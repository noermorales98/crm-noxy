// Identidad por empresa (sub-cuenta): color, icono y tema. Funciones puras, sin base de datos.
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { isCrmThemeId, resolveCrmTheme } from "./crm-themes.ts";

/** Colores ofrecidos (sin violeta). El primero es el índigo de Noxy. */
export const BRAND_COLORS = [
  { id: "indigo", label: "Índigo", hex: "#3545D6" },
  { id: "azul", label: "Azul", hex: "#2F6FED" },
  { id: "turquesa", label: "Turquesa", hex: "#0E9F9A" },
  { id: "verde", label: "Verde", hex: "#2E9E5B" },
  { id: "ambar", label: "Ámbar", hex: "#C9973B" },
  { id: "naranja", label: "Naranja", hex: "#E0701F" },
  { id: "rojo", label: "Rojo", hex: "#D64545" },
  { id: "rosa", label: "Rosa", hex: "#D6457F" },
  { id: "grafito", label: "Grafito", hex: "#0B0B18" },
] as const;

/** Claves de icono admitidas; el dibujo vive en el componente. */
export const BRAND_ICON_KEYS = ["building", "people", "chart", "web", "book", "megaphone", "calendar", "invoice", "vault", "sparkles", "tasks", "folder", "money"] as const;
export type BrandIconKey = (typeof BRAND_ICON_KEYS)[number];

export type OrgBrand = { brandColor: string | null; brandIcon: string | null; themeId: string | null };
export type OrgBrandPatch = Partial<OrgBrand>;

const HEX = /^#[0-9a-fA-F]{6}$/;

export function isBrandIconKey(value: unknown): value is BrandIconKey {
  return typeof value === "string" && (BRAND_ICON_KEYS as readonly string[]).includes(value);
}

/** Valida lo que llega del formulario. Cada campo es opcional; `null` o "" lo quita (vuelve a la identidad Noxy / al tema personal). */
export function parseOrgBrandPatch(body: unknown): { ok: true; patch: OrgBrandPatch } | { ok: false; error: string } {
  const raw = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const patch: OrgBrandPatch = {};
  if ("brandColor" in raw) {
    const v = raw.brandColor;
    if (v === null || v === "") patch.brandColor = null;
    else if (typeof v === "string" && HEX.test(v)) patch.brandColor = v.toUpperCase();
    else return { ok: false, error: "El color debe ser un valor hexadecimal como #3545D6" };
  }
  if ("brandIcon" in raw) {
    const v = raw.brandIcon;
    if (v === null || v === "") patch.brandIcon = null;
    else if (isBrandIconKey(v)) patch.brandIcon = v;
    else return { ok: false, error: "Icono no válido" };
  }
  if ("themeId" in raw) {
    const v = raw.themeId;
    if (v === null || v === "") patch.themeId = null;
    else if (isCrmThemeId(v)) patch.themeId = v;
    else return { ok: false, error: "Tema no válido" };
  }
  return { ok: true, patch };
}

/** Tema que se aplica: el propio de la empresa si lo tiene; si no, el de la persona; si no, el de Noxy. */
export function resolveActiveThemeId(orgThemeId: unknown, userThemeId: unknown): { themeId: string; lockedByOrg: boolean } {
  if (isCrmThemeId(orgThemeId)) return { themeId: orgThemeId, lockedByOrg: true };
  return { themeId: resolveCrmTheme(userThemeId).id, lockedByOrg: false };
}

/** Color del icono sobre el fondo de la empresa: blanco u obsidiana según el contraste. */
export function inkOn(hex: string): "#FFFFFF" | "#0B0B18" {
  if (!HEX.test(hex)) return "#FFFFFF";
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.4 ? "#0B0B18" : "#FFFFFF";
}


/** Lo que el servidor resuelve antes de pintar: tema activo y la empresa actual. Así la primera pantalla ya sale con el tema correcto. */
export type ThemeBoot = {
  themeId: string;
  /** El tema lo fija la empresa: la persona no puede cambiarlo desde su menú. */
  lockedByOrg: boolean;
  org: { id: string; name: string; brandColor: string | null; brandIcon: string | null } | null;
};

export const EMPTY_THEME_BOOT: ThemeBoot = { themeId: "noxy-indigo", lockedByOrg: false, org: null };
