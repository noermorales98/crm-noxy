// Iconos que se pueden elegir para un lead. Solo las claves y etiquetas viven aquí (también las valida el servidor);
// el componente DealIcon las asocia con los iconos gratuitos de Hugeicons.

export const DEAL_ICON_KEYS = [
  "user",
  "target",
  "rocket",
  "briefcase",
  "building",
  "store",
  "shop",
  "home",
  "car",
  "food",
  "health",
  "education",
  "media",
  "idea",
  "megaphone",
  "star",
  "heart",
  "globe",
] as const;

export type DealIconKey = (typeof DEAL_ICON_KEYS)[number];

export const DEFAULT_DEAL_ICON: DealIconKey = "user";

export const DEAL_ICON_LABELS: Record<DealIconKey, string> = {
  user: "Persona",
  target: "Objetivo",
  rocket: "Startup",
  briefcase: "Negocios",
  building: "Empresa",
  store: "Tienda",
  shop: "Comercio",
  home: "Inmuebles",
  car: "Automotriz",
  food: "Restaurante",
  health: "Salud",
  education: "Educación",
  media: "Medios",
  idea: "Proyecto",
  megaphone: "Marketing",
  star: "Destacado",
  heart: "Favorito",
  globe: "Internacional",
};

/** Clave válida o `null`. Usa la lista cerrada, así que una clave inventada nunca llega a la base de datos. */
export function normalizeDealIcon(value: unknown): DealIconKey | null {
  if (typeof value !== "string") return null;
  const key = value.trim();
  return (DEAL_ICON_KEYS as readonly string[]).includes(key) ? (key as DealIconKey) : null;
}
