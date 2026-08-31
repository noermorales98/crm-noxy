/**
 * Devuelve un color de texto legible (`#ffffff` o `#111827`) para colocar
 * sobre un fondo `hex`, usando la fórmula de luminancia YIQ.
 * Acepta "#RGB" y "#RRGGBB"; ante un valor inválido devuelve blanco.
 */
export function getContrastText(hex: string): string {
  const m = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return "#ffffff";
  let h = m[1];
  if (h.length === 3) {
    h = h.split("").map((c) => c + c).join("");
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? "#111827" : "#ffffff";
}
