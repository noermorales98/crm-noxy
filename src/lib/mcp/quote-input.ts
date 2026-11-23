// Validación pura de la edición de cotizaciones desde el MCP (sin base de datos).

export const EDITABLE_QUOTE_STATUSES = ["BORRADOR", "ENVIADA"] as const;

export type QuoteEditItem = { description: string; quantity: number; unitPrice: number; discount?: number };

export type QuoteEditInput = {
  items?: QuoteEditItem[];
  taxRate?: number;
  validUntil?: string | null;
  notes?: string | null;
  terms?: string | null;
  clientName?: string;
  clientCompany?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
};

export function canEditQuote(status: string): boolean {
  return (EDITABLE_QUOTE_STATUSES as readonly string[]).includes(status);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Devuelve el error en español o `null` si la edición es válida y trae al menos un cambio. */
export function validateQuoteEdit(input: QuoteEditInput): string | null {
  const keys = Object.entries(input).filter(([, value]) => value !== undefined);
  if (!keys.length) return "No hay nada que cambiar: indica al menos un campo.";
  if (input.clientName !== undefined && !input.clientName.trim()) return "El nombre del cliente no puede quedar vacío.";
  if (input.clientEmail && !EMAIL.test(input.clientEmail)) return "El correo del cliente no tiene un formato válido.";
  if (input.taxRate !== undefined && (!Number.isFinite(input.taxRate) || input.taxRate < 0 || input.taxRate > 100)) {
    return "La tasa de impuesto debe estar entre 0 y 100.";
  }
  if (input.validUntil && Number.isNaN(new Date(input.validUntil).getTime())) return "La fecha de vigencia no es válida.";
  if (input.items !== undefined) {
    if (!input.items.length) return "Agrega al menos un concepto a la cotización.";
    for (const [i, item] of input.items.entries()) {
      if (!item.description?.trim()) return `El concepto ${i + 1} no tiene descripción.`;
      if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) return `El concepto ${i + 1} no tiene un precio válido.`;
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) return `El concepto ${i + 1} no tiene una cantidad válida.`;
    }
  }
  return null;
}

/** Campos de texto/fecha de la cotización a escribir (sin totales ni conceptos). */
export function quoteScalarData(input: QuoteEditInput): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (input.clientName !== undefined) data.clientName = input.clientName.trim();
  if (input.clientCompany !== undefined) data.clientCompany = input.clientCompany || null;
  if (input.clientEmail !== undefined) data.clientEmail = input.clientEmail || null;
  if (input.clientPhone !== undefined) data.clientPhone = input.clientPhone || null;
  if (input.notes !== undefined) data.notes = input.notes || null;
  if (input.terms !== undefined) data.terms = input.terms || null;
  if (input.validUntil !== undefined) data.validUntil = input.validUntil ? new Date(input.validUntil) : null;
  return data;
}
