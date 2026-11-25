// Lector de los bloques ```action de la IA. Los modelos suelen escribir saltos de línea reales dentro de los textos
// (el cuerpo de un correo), lo que no es JSON válido. Aquí se repara eso; lo truncado o sin "type" se rechaza.

/** Escapa los saltos de línea y tabulaciones que aparecen DENTRO de un texto entre comillas. */
function escapeControlCharsInStrings(raw: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  for (const ch of raw) {
    if (inString) {
      if (escaped) { out += ch; escaped = false; continue; }
      if (ch === "\\") { out += ch; escaped = true; continue; }
      if (ch === '"') { out += ch; inString = false; continue; }
      if (ch === "\n") { out += "\\n"; continue; }
      if (ch === "\r") { continue; }
      if (ch === "\t") { out += "\\t"; continue; }
      out += ch;
    } else {
      if (ch === '"') inString = true;
      out += ch;
    }
  }
  return out;
}

/** Quita comas antes de } o ] (fuera de textos). */
function stripTrailingCommas(raw: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (inString) {
      out += ch;
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; out += ch; continue; }
    if (ch === ",") {
      let j = i + 1;
      while (j < raw.length && /\s/.test(raw[j])) j++;
      if (raw[j] === "}" || raw[j] === "]") continue;
    }
    out += ch;
  }
  return out;
}

function tryParse(text: string): Record<string, unknown> | null {
  try {
    const v: unknown = JSON.parse(text);
    return v && typeof v === "object" && !Array.isArray(v) && typeof (v as { type?: unknown }).type === "string" ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Devuelve la acción lista para usar, o null si no es legible o está incompleta. */
export function parseActionJson(raw: string): (Record<string, unknown> & { type: string }) | null {
  const text = raw.trim();
  const direct = tryParse(text);
  if (direct) return direct as Record<string, unknown> & { type: string };
  const repaired = tryParse(stripTrailingCommas(escapeControlCharsInStrings(text)));
  return repaired as (Record<string, unknown> & { type: string }) | null;
}
