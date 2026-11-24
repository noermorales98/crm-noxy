// Quita los emojis de una respuesta de la IA sin tocar los bloques de código (ahí van las tarjetas de acción en JSON). Función pura.

const PICTO = "[\\u{1F000}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{2B50}\\u{2B55}\\u{2B1B}\\u{2B1C}\\u{231A}\\u{231B}\\u{23E9}-\\u{23F3}\\u{23F8}-\\u{23FA}\\u{203C}\\u{2049}]";
// Un emoji (con sus modificadores y uniones) y el espacio que lo sigue, para que no quede un hueco.
const EMOJI = new RegExp(`(?:${PICTO}[\\uFE0F\\u200D]*)+[ \\t]?|[\\uFE0F\\u200D]`, "gu");

function clean(text: string): string {
  return text.replace(EMOJI, "").replace(/[ \t]+$/gm, "");
}

export function stripEmojis(text: string): string {
  if (!text) return text;
  // Los trozos pares son texto; los impares, bloques ``` ... ``` que se dejan tal cual (el último puede estar sin cerrar mientras llega).
  return text
    .split(/(```[\s\S]*?(?:```|$))/g)
    .map((part, i) => (i % 2 === 1 ? part : clean(part)))
    .join("");
}
