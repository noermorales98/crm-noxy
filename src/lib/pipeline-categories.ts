// Categorías del pipeline = filas de la tabla Pipeline (se crean desde la interfaz y viven en la base).
// Funciones puras, sin base de datos.

export const MAX_CATEGORY_NAME = 60;

/** Etapas con las que nace una categoría nueva: una abierta, una en curso, una ganadora y una perdida. */
export const NEW_CATEGORY_STAGES = [
  { name: "Nuevo", color: "#6B7280", isWon: false, isLost: false },
  { name: "En proceso", color: "#8b5cf6", isWon: false, isLost: false },
  { name: "Ganado", color: "#10b981", isWon: true, isLost: false },
  { name: "Perdido", color: "#ef4444", isWon: false, isLost: true },
] as const;

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

/** Valida el nombre de una categoría nueva: no vacío, no demasiado largo y distinto (sin acentos ni mayúsculas) de las que ya existen. */
export function parseCategoryName(body: unknown, existingNames: string[]): { ok: true; name: string } | { ok: false; error: string } {
  const raw = body && typeof body === "object" ? (body as Record<string, unknown>).name : undefined;
  const name = typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : "";
  if (!name) return { ok: false, error: "El nombre es obligatorio" };
  if (name.length > MAX_CATEGORY_NAME) return { ok: false, error: `El nombre admite hasta ${MAX_CATEGORY_NAME} caracteres` };
  if (existingNames.some((n) => norm(n) === norm(name))) return { ok: false, error: "Ya existe una categoría con ese nombre" };
  return { ok: true, name };
}

/** Qué pipelines se dibujan: todos, o solo el elegido (si el elegido ya no existe, todos). */
export function visiblePipelines<T extends { id: string }>(pipelines: T[], selected: string): T[] {
  if (selected === "all") return pipelines;
  const one = pipelines.filter((p) => p.id === selected);
  return one.length ? one : pipelines;
}
