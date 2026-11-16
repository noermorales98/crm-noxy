// Leads ganados como ventas, y su vínculo con cotizaciones. Funciones puras: las usan la UI, el resumen y el MCP.

export type Money = Record<string, number>;

export type LeadForQuote = {
  id: string;
  title: string;
  value: number | null;
  currency: string;
  contact: { id: string; firstName: string; lastName: string | null; email: string | null; phone: string | null } | null;
  company: { name: string } | null;
};

export type QuotePrefill = {
  dealId: string;
  contactId: string;
  clientName: string;
  clientCompany: string;
  clientEmail: string;
  clientPhone: string;
  currency: string;
  items: { description: string; quantity: number; unitPrice: number; discount: number }[];
};

/** Datos con los que se abre «Nueva cotización» desde un lead: cliente, moneda y un concepto con el valor del lead. */
export function dealToQuotePrefill(deal: LeadForQuote): QuotePrefill {
  const contactName = deal.contact ? [deal.contact.firstName, deal.contact.lastName].filter(Boolean).join(" ").trim() : "";
  return {
    dealId: deal.id,
    contactId: deal.contact?.id ?? "",
    clientName: contactName || deal.company?.name || deal.title,
    clientCompany: deal.company?.name ?? "",
    clientEmail: deal.contact?.email ?? "",
    clientPhone: deal.contact?.phone ?? "",
    currency: deal.currency || "MXN",
    items: [{ description: deal.title, quantity: 1, unitPrice: deal.value ?? 0, discount: 0 }],
  };
}

export type WonDeal = {
  value: number | null;
  currency: string;
  updatedAt: Date;
  quotes: { status: string; total: number; currency: string }[];
};

const add = (bucket: Money, currency: string, amount: number) => {
  bucket[currency] = (bucket[currency] ?? 0) + amount;
};

export type WonSalesSummary = {
  total: { count: number; byCurrency: Money };
  month: { count: number; byCurrency: Money };
  withQuote: number;
  withoutQuote: number;
  /** Cotizaciones aceptadas, parciales o pagadas de los leads ganados. */
  quotedByCurrency: Money;
  paidByCurrency: Money;
};

const COUNTED = new Set(["ACEPTADA", "PARCIAL", "PAGADA"]);

export type EffectiveValue = { amount: number; currency: string; source: "manual" | "quotes" | "none" };

/**
 * Valor del lead. Si lo capturaste a mano (mayor a 0) manda tu número. Si está vacío o en 0, es la suma de
 * sus cotizaciones aceptadas, parciales o pagadas, en la moneda del lead (o, si no hay en esa, en la de la primera que cuente).
 */
export function effectiveDealValue(deal: {
  value: number | null;
  currency: string;
  quotes: { status: string; total: number; currency: string }[];
}): EffectiveValue {
  if (deal.value && deal.value > 0) return { amount: deal.value, currency: deal.currency, source: "manual" };
  const counted = deal.quotes.filter((quote) => COUNTED.has(quote.status) && quote.total > 0);
  if (counted.length === 0) return { amount: 0, currency: deal.currency, source: "none" };
  const currency = counted.some((quote) => quote.currency === deal.currency) ? deal.currency : counted[0].currency;
  const amount = counted.filter((quote) => quote.currency === currency).reduce((sum, quote) => sum + quote.total, 0);
  return { amount, currency, source: "quotes" };
}

/** Ventas = leads en etapa ganada. «Este mes» usa `updatedAt`, igual que el tablero de Inicio. */
export function summarizeWonSales(deals: WonDeal[], now = new Date()): WonSalesSummary {
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const summary: WonSalesSummary = {
    total: { count: 0, byCurrency: {} },
    month: { count: 0, byCurrency: {} },
    withQuote: 0,
    withoutQuote: 0,
    quotedByCurrency: {},
    paidByCurrency: {},
  };
  for (const deal of deals) {
    const { amount: value, currency } = effectiveDealValue(deal);
    const thisMonth = deal.updatedAt >= startOfMonth;
    summary.total.count++;
    add(summary.total.byCurrency, currency, value);
    if (thisMonth) {
      summary.month.count++;
      add(summary.month.byCurrency, currency, value);
    }
    if (deal.quotes.length) summary.withQuote++;
    else summary.withoutQuote++;
    for (const quote of deal.quotes) {
      if (COUNTED.has(quote.status)) add(summary.quotedByCurrency, quote.currency, quote.total);
      if (quote.status === "PAGADA") add(summary.paidByCurrency, quote.currency, quote.total);
    }
  }
  return summary;
}

/** Una moneda por tramo (USD, MXN), sin convertir entre ellas. */
export function formatByCurrency(money: Money): string {
  const parts = Object.entries(money).map(([currency, amount]) => `${currency} $${amount.toLocaleString("en-US")}`);
  return parts.length ? parts.join(" | ") : "sin importe";
}
