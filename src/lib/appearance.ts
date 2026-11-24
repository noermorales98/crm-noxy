// Apariencia personal: modo (automático, claro u oscuro), radio de esquinas y bordes. Puro: sin base de datos ni navegador.
// Se guarda en una cookie del navegador (por dispositivo, como el modo oscuro del sistema) para que el servidor pinte la primera
// pantalla ya con la apariencia elegida, sin parpadeo.

export type AppearanceMode = "auto" | "light" | "dark";
export type RadiusScale = "sharp" | "soft" | "normal" | "round";
export type BorderStyle = "normal" | "soft" | "none";
export type Appearance = { mode: AppearanceMode; radius: RadiusScale; borders: BorderStyle };

export const DEFAULT_APPEARANCE: Appearance = { mode: "light", radius: "normal", borders: "normal" };
export const APPEARANCE_COOKIE = "noxy-appearance";

export const MODES: { value: AppearanceMode; label: string; hint: string }[] = [
  { value: "auto", label: "Automático", hint: "Sigue el modo de tu dispositivo" },
  { value: "light", label: "Claro", hint: "Siempre claro" },
  { value: "dark", label: "Oscuro", hint: "Siempre oscuro" },
];

/** Radios en px de controles (botones, campos), superficies (tarjetas, paneles) y piezas de interfaz (menús, chips grandes). */
export const RADII: Record<RadiusScale, { label: string; control: number; surface: number; ui: number }> = {
  sharp: { label: "Cuadrado", control: 2, surface: 2, ui: 2 },
  soft: { label: "Suave", control: 6, surface: 8, ui: 8 },
  normal: { label: "Normal", control: 10, surface: 12, ui: 12 },
  round: { label: "Redondo", control: 16, surface: 24, ui: 24 },
};

export const BORDER_STYLES: { value: BorderStyle; label: string; hint: string }[] = [
  { value: "normal", label: "Con bordes", hint: "Línea fina en tarjetas y paneles" },
  { value: "soft", label: "Bordes suaves", hint: "Líneas casi invisibles" },
  { value: "none", label: "Sin bordes", hint: "Solo una sombra ligera" },
];

const isMode = (v: unknown): v is AppearanceMode => v === "auto" || v === "light" || v === "dark";
const isRadius = (v: unknown): v is RadiusScale => typeof v === "string" && v in RADII;
const isBorders = (v: unknown): v is BorderStyle => v === "normal" || v === "soft" || v === "none";

/** Lee el valor de la cookie (JSON, con o sin codificar) sin fiarse de su forma: lo que no cuadre vuelve al valor por defecto. */
export function parseAppearance(raw: string | null | undefined): Appearance {
  if (!raw) return { ...DEFAULT_APPEARANCE };
  let data: Partial<Appearance> = {};
  try {
    data = JSON.parse(raw.startsWith("{") ? raw : decodeURIComponent(raw)) as Partial<Appearance>;
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
  return {
    mode: isMode(data.mode) ? data.mode : DEFAULT_APPEARANCE.mode,
    radius: isRadius(data.radius) ? data.radius : DEFAULT_APPEARANCE.radius,
    borders: isBorders(data.borders) ? data.borders : DEFAULT_APPEARANCE.borders,
  };
}

export const serializeAppearance = (a: Appearance): string => encodeURIComponent(JSON.stringify(a));

/** Variables de radio del marco. */
export function radiusVars(radius: RadiusScale): Record<`--${string}`, string> {
  const r = RADII[radius];
  return { "--radius-control": `${r.control}px`, "--radius-surface": `${r.surface}px`, "--radius-ui": `${r.ui}px` };
}
