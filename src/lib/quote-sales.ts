// Fechas y cobros de las cotizaciones. Funciones puras: las usan el cierre del mes y el vínculo con un deal.
//
// Regla de fechas: la VENTA tiene una sola fecha, la del deal (`wonAt`). Las fechas de pago son de la cotización
// y sirven para medir cobros, no para decir cuándo se vendió.

export type QuoteDates = {
  total: number;
  currency: string;
  splitPayment: boolean;
  depositPercent: number | null;
  acceptedAt: Date | null;
  paidAt: Date | null;
  depositPaidAt: Date | null;
  finalPaidAt: Date | null;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Fecha en que se cerró la venta según la cotización: la primera entre aceptación y pagos. null si nada ocurrió aún. */
export function quoteSaleDate(quote: Pick<QuoteDates, "acceptedAt" | "paidAt" | "depositPaidAt" | "finalPaidAt">): Date | null {
  const dates = [quote.acceptedAt, quote.depositPaidAt, quote.paidAt, quote.finalPaidAt].filter((d): d is Date => d instanceof Date && !Number.isNaN(d.getTime()));
  if (dates.length === 0) return null;
  return new Date(Math.min(...dates.map((d) => d.getTime())));
}

export type QuoteReceipt = { amount: number; currency: string; at: Date };

/**
 * Dinero que la cotización ya cobró, con su fecha. Pago único: el total en `paidAt`. En dos pagos: el anticipo
 * en `depositPaidAt` y el resto en `finalPaidAt`; si se confirmó el final sin anticipo registrado, ese pago
 * cubre el total (así se confirma a mano una transferencia).
 */
export function quoteReceipts(quote: QuoteDates): QuoteReceipt[] {
  if (!quote.splitPayment) return quote.paidAt ? [{ amount: quote.total, currency: quote.currency, at: quote.paidAt }] : [];
  const deposit = round2(quote.total * ((quote.depositPercent ?? 50) / 100));
  const receipts: QuoteReceipt[] = [];
  if (quote.depositPaidAt) receipts.push({ amount: deposit, currency: quote.currency, at: quote.depositPaidAt });
  if (quote.finalPaidAt) receipts.push({ amount: quote.depositPaidAt ? round2(quote.total - deposit) : quote.total, currency: quote.currency, at: quote.finalPaidAt });
  return receipts;
}

/** Cobros de varias cotizaciones que caen en [from, to). */
export function receiptsInRange(quotes: QuoteDates[], from: Date, to: Date): { amount: number; currency: string }[] {
  return quotes
    .flatMap(quoteReceipts)
    .filter((receipt) => receipt.at >= from && receipt.at < to)
    .map(({ amount, currency }) => ({ amount, currency }));
}

export type SaleDateChoice = {
  /** Instante (ISO) que se guardaría como fecha de la venta: el primero de los eventos de ese día. */
  value: string;
  /** Día calendario en la zona de la organización (YYYY-MM-DD). */
  day: string;
  /** Ese día escrito, p. ej. «6 ago 2026». */
  dateLabel: string;
  /** Qué ocurrió ese día, p. ej. «Cotización aceptada · Cotización pagada». */
  reason: string;
};

const dayKey = (date: Date, timeZone: string) => new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);

/** Día calendario (YYYY-MM-DD) de un instante en la zona dada. */
export const dayInZone = dayKey;

/**
 * Fechas posibles de una venta nacida de una cotización: cuándo se aceptó, se pagó (anticipo, resto o pago único)
 * y, si ya está ganado, cuándo se marcó ganado el deal. Eventos del mismo día se juntan en una opción.
 * Con más de una opción hay que PREGUNTAR cuál es la correcta; con una o ninguna no hay duda.
 */
export function saleDateChoices(quote: QuoteDates, dealWonAt: Date | null, timeZone: string): SaleDateChoice[] {
  const events: { at: Date; reason: string }[] = [];
  const add = (at: Date | null, reason: string) => {
    if (at instanceof Date && !Number.isNaN(at.getTime())) events.push({ at, reason });
  };
  add(quote.acceptedAt, "Cotización aceptada");
  if (quote.splitPayment) {
    add(quote.depositPaidAt, "Anticipo pagado");
    add(quote.finalPaidAt, "Pago final");
  } else {
    add(quote.paidAt, "Cotización pagada");
  }
  add(dealWonAt, "Deal marcado como ganado");

  const byDay = new Map<string, { first: Date; reasons: string[] }>();
  for (const event of events.sort((a, b) => a.at.getTime() - b.at.getTime())) {
    const key = dayKey(event.at, timeZone);
    const entry = byDay.get(key);
    if (entry) {
      if (!entry.reasons.includes(event.reason)) entry.reasons.push(event.reason);
    } else byDay.set(key, { first: event.at, reasons: [event.reason] });
  }
  return [...byDay.entries()].map(([day, { first, reasons }]) => ({
    value: first.toISOString(),
    day,
    dateLabel: new Intl.DateTimeFormat("es-MX", { timeZone, day: "numeric", month: "short", year: "numeric" }).format(first).replace(/\./g, ""),
    reason: reasons.join(" · "),
  }));
}
