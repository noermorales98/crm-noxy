export const VIDEO_NUMERIC_FIELDS = [
  "durationSeconds",
  "reach",
  "views",
  "retention3s",
  "shares",
  "saves",
  "comments",
  "leadsGenerated",
  "predictorScore",
] as const;

export const VIDEO_OPTIONAL_STRING_FIELDS = ["hook", "hookType", "format", "aiTool", "prompt", "notes"] as const;

export type VideoImportRow = Record<string, unknown>;

/**
 * Normaliza una fila suelta (CSV, PDF/IA o formulario) a los campos del modelo Video.
 * Devuelve null si falta lo mínimo (título y plataforma).
 * Una clave presente con valor vacío o null se guarda como null (así la edición puede limpiar campos);
 * una clave ausente se ignora (las importaciones parciales no tocan lo que no traen).
 */
export function coerceVideoRow(row: VideoImportRow) {
  const title = typeof row.title === "string" ? row.title.trim() : "";
  const platform = typeof row.platform === "string" ? row.platform.trim() : "";
  if (!title || !platform) return null;

  const data: Record<string, unknown> = { title: title.slice(0, 300), platform: platform.slice(0, 60) };

  for (const key of VIDEO_OPTIONAL_STRING_FIELDS) {
    if (!(key in row)) continue;
    const value = row[key];
    data[key] = typeof value === "string" && value.trim() ? value.trim() : null;
  }

  for (const key of VIDEO_NUMERIC_FIELDS) {
    if (!(key in row)) continue;
    const n = Number(row[key]);
    data[key] = row[key] != null && row[key] !== "" && Number.isFinite(n) && n >= 0
      ? key === "retention3s" || key === "predictorScore" ? n : Math.round(n)
      : null;
  }

  if ("publishedAt" in row) {
    const raw = row.publishedAt;
    const date = raw ? new Date(String(raw).length === 10 ? `${raw}T12:00:00Z` : String(raw)) : null;
    data.publishedAt = date && !Number.isNaN(date.getTime()) ? date : null;
  }

  return data as {
    title: string;
    platform: string;
    publishedAt?: Date | null;
  } & Record<string, unknown>;
}
