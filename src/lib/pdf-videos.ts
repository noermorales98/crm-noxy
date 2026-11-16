export const PDF_SYSTEM_PROMPT = `Eres un extractor de datos de reportes de Metricool (métricas de videos en redes sociales).
Te llega el texto extraído de un PDF de Metricool. Devuelves SOLO un JSON válido, sin markdown ni explicaciones:
{"videos":[{"title":"...","platform":"TikTok","publishedAt":"YYYY-MM-DD","reach":1234,"views":1234,"shares":12,"saves":12,"comments":12,"retention3s":23.5}]}
Reglas:
- Una entrada por cada video/fila del reporte.
- "platform": red social del video (TikTok, Instagram, Facebook, YouTube…). Si el reporte es de una sola red, repítela.
- "publishedAt": fecha de publicación en formato YYYY-MM-DD. Si solo hay hora, usa la fecha que acompaña a la fila; si no hay fecha, omite el campo.
- reach = alcance, views = vistas/reproducciones, shares = compartidos, saves = guardados, comments = comentarios, retention3s = retención a 3 segundos en porcentaje (solo el número).
- Convierte abreviaturas a números enteros: 1,2K o 1.2k = 1200; 3M = 3000000; "45 %" = 45.
- Si una fila no tiene título, usa el primer texto descriptivo que tenga.
- Si el texto no contiene ningún video, devuelve {"videos":[]}.`;

export function buildPdfExtractionPrompt(text: string) {
  const clipped = text.length > 14000 ? `${text.slice(0, 14000)}\n[...recortado por longitud]` : text;
  return `Extrae las filas de videos de este reporte de Metricool:\n\n${clipped}`;
}

/** Interpreta números con abreviaturas de redes ("1,2K", "3.4M", "45 %", "12.500") o null si no aplica. */
export function parseMetricNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/[%\s]/g, "").replace(/[–—-]/g, "-");
  if (!cleaned || /^-?$/u.test(cleaned)) return null;
  const match = cleaned.match(/^(-?[\d.,]+)\s*([kKmM])?$/u);
  if (!match) return null;
  let digits = match[1];
  const suffix = match[2]?.toUpperCase();
  // Último separador = decimal; los anteriores son de miles.
  const lastDot = digits.lastIndexOf(".");
  const lastComma = digits.lastIndexOf(",");
  if (lastDot > -1 && lastComma > -1) {
    digits = lastDot > lastComma ? digits.replace(/,/g, "") : digits.replace(/\./g, "").replace(",", ".");
  } else if (lastComma > -1) {
    const decimals = digits.length - lastComma - 1;
    digits = decimals === 3 && !suffix ? digits.replace(",", "") : digits.replace(",", ".");
  } else if (lastDot > -1) {
    const decimals = digits.length - lastDot - 1;
    digits = decimals === 3 && !suffix ? digits.replace(".", "") : digits;
  }
  const n = Number(digits);
  if (!Number.isFinite(n)) return null;
  const factor = suffix === "K" ? 1_000 : suffix === "M" ? 1_000_000 : 1;
  return n * factor;
}

/** Saca el primer objeto JSON del texto de la IA aunque venga envuelto en markdown o cortado. */
export function extractJsonObject(text: string): { videos?: unknown } | null {
  const t = text.replace(/```(?:json)?/gi, "");
  const start = t.indexOf("{");
  if (start === -1) return null;
  const candidates: string[] = [];
  const end = t.lastIndexOf("}");
  if (end > start) candidates.push(t.slice(start, end + 1));
  const lastComplete = t.lastIndexOf("},");
  if (lastComplete > start) candidates.push(`${t.slice(start, lastComplete + 1)}]}`);
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // probar siguiente candidato
    }
  }
  return null;
}

/** Valida la respuesta de la IA y la convierte a filas importables (descarta las incompletas). */
export function normalizeVideoRows(parsed: unknown, defaultPlatform?: string): Record<string, unknown>[] {
  if (!parsed || typeof parsed !== "object") return [];
  const videos = (parsed as { videos?: unknown }).videos;
  if (!Array.isArray(videos)) return [];
  return videos
    .filter((v): v is Record<string, unknown> => Boolean(v) && typeof v === "object")
    .map((v) => {
      const row: Record<string, unknown> = {
        title: v.title,
        platform: (typeof v.platform === "string" && v.platform.trim()) || defaultPlatform || "",
        publishedAt: v.publishedAt,
      };
      for (const key of ["reach", "views", "shares", "saves", "comments", "retention3s"] as const) {
        const n = parseMetricNumber(v[key]);
        if (n != null) row[key] = n;
      }
      return row;
    })
    .filter((row) => {
      const title = row.title;
      const platform = row.platform;
      return typeof title === "string" && title.trim() !== "" && typeof platform === "string" && platform.trim() !== "";
    })
    .slice(0, 200);
}
