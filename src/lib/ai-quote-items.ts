// Líneas de una cotización escritas como texto («descripción | cantidad | precio») para editarlas en una tarjeta de la IA. Funciones puras.

export interface QuoteLine {
  description: string;
  quantity: number;
  unitPrice: number;
}

/** Una línea por concepto: `Diseño web | 1 | 12000`. Cantidad y precio son opcionales (1 y 0). Las líneas vacías se ignoran. */
export function parseQuoteLines(text: string): QuoteLine[] {
  const out: QuoteLine[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const [description, qty, price] = line.split("|").map((p) => p.trim());
    if (!description) continue;
    const quantity = qty ? Number(qty.replace(",", ".")) : 1;
    const unitPrice = price ? Number(price.replace(/[$\s]/g, "").replace(/,(?=\d{3}\b)/g, "").replace(",", ".")) : 0;
    out.push({ description, quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1, unitPrice: Number.isFinite(unitPrice) && unitPrice >= 0 ? unitPrice : 0 });
  }
  return out;
}

export function formatQuoteLines(lines: ReadonlyArray<{ description?: unknown; quantity?: unknown; unitPrice?: unknown }>): string {
  return lines
    .map((l) => `${String(l.description ?? "").trim()} | ${Number(l.quantity) || 1} | ${Number(l.unitPrice) || 0}`)
    .filter((l) => !l.startsWith(" |"))
    .join("\n");
}
