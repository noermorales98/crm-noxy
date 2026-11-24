// Palabras clave de un mensaje para buscar en el CRM. Función pura (sin base de datos).

const STOP = new Set(["para", "como", "pero", "esto", "esta", "este", "esos", "esas", "quiero", "puedes", "dame", "hazme", "sobre", "tiene", "tengo", "cual", "cuales", "donde", "cuando", "porque", "todo", "todos", "toda", "todas", "algo", "mas", "hay", "los", "las", "una", "uno", "que", "con", "del", "por", "mis", "muestra", "dime", "necesito", "haz", "hola", "gracias", "buenas", "favor"]);

/** Palabras con peso del mensaje (sin acentos, ≥4 letras, sin muletillas), para buscar en docs, contenido y videos. */
export function searchTerms(message: string): string[] {
  const words = message
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9ñ]+/)
    .filter((w) => w.length >= 4 && !STOP.has(w));
  return [...new Set(words)].slice(0, 5);
}

