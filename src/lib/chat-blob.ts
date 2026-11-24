import { blobatar } from "blobatar";

/** Semilla de la criatura de un chat guardado: la que se recordó al crearlo o, si no hay, su propio id (siempre la misma). */
export function chatBlobSeed(conversationId: string): string {
  try {
    return localStorage.getItem(`assistant-blob-${conversationId}`) || conversationId;
  } catch {
    return conversationId;
  }
}

const toRgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
const toHex = (rgb: number[]) => `#${rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;

/** Mezcla `hex` con `other` (0 = todo `hex`, 1 = todo `other`). */
export function mixHex(hex: string, other: string, amount: number): string {
  const a = toRgb(hex);
  const b = toRgb(other);
  return toHex(a.map((v, i) => v + (b[i] - v) * amount));
}

/** Luminancia relativa WCAG de un color #rrggbb. */
function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contraste WCAG entre dos colores #rrggbb (de 1 a 21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Colores del mensaje del usuario y del botón de enviar, sacados de la cara de la criatura: `bubble` es el color de su cara
 * (aclarado solo lo necesario) y `text` la letra, que siempre cumple contraste 7:1 sobre ese fondo.
 */
export function chatPalette(accent: string, ink: string): { bubble: string; text: string } {
  for (const lighten of [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1]) {
    const bubble = mixHex(accent, "#ffffff", lighten);
    let text = ink;
    for (let i = 0; i < 10 && contrastRatio(text, bubble) < 7; i++) text = mixHex(text, "#000000", 0.25);
    if (contrastRatio(text, bubble) < 7) text = "#111111";
    if (contrastRatio(text, bubble) >= 7) return { bubble, text };
  }
  return { bubble: "#ffffff", text: "#111111" };
}

/** Colores de la criatura (cabeza y ojos), leídos de su propio dibujo. */
export function blobColors(seed: string): { bubble: string; text: string } {
  const fills = String(blobatar(seed, {})).match(/fill="(#[0-9a-fA-F]{6})"/g) ?? [];
  const hex = (f: string | undefined, fallback: string) => f?.match(/#[0-9a-fA-F]{6}/)?.[0] ?? fallback;
  return chatPalette(hex(fills[0], "#c9d6f3"), hex(fills[1], "#1D1D1F"));
}
