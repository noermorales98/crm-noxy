// Líneas de apoyo de los resultados del buscador (Spotlight). Funciones puras.

const money = (value: number | null | undefined, currency: string) => (value != null ? `$${value.toLocaleString("es-MX")} ${currency}` : "");

const QUOTE_STATUS: Record<string, string> = {
  BORRADOR: "Borrador", ENVIADA: "Enviada", ACEPTADA: "Aceptada", PARCIAL: "Pago parcial", PAGADA: "Pagada", VENCIDA: "Vencida", RECHAZADA: "Rechazada",
};

/** Monto, estado del deal (perdido con su motivo, ganado, archivado) y si le falta cobrar saldo. */
export function dealSearchSubtitle(deal: {
  value: number | null;
  currency: string;
  isArchived?: boolean;
  lostReason?: string | null;
  stage?: { name: string; isWon?: boolean; isLost?: boolean } | null;
  quotes?: { status: string }[];
}): string | undefined {
  const parts: string[] = [];
  const amount = money(deal.value, deal.currency);
  if (amount) parts.push(amount);
  if (deal.stage?.isLost) {
    const reason = deal.lostReason?.trim();
    parts.push(reason ? `Perdido: ${reason.length > 60 ? `${reason.slice(0, 57)}…` : reason}` : "Perdido");
  } else if (deal.stage?.isWon) {
    parts.push(`Ganado · ${deal.stage.name}`);
    if (deal.quotes?.some((quote) => quote.status === "PARCIAL")) parts.push("falta cobrar el saldo");
  } else if (deal.stage?.name) {
    parts.push(deal.stage.name);
  }
  if (deal.isArchived) parts.push("archivado");
  return parts.length ? parts.join(" · ") : undefined;
}

/** Estado, monto y el deal al que está ligada; una pagada sin deal se avisa porque no sale en el historial. */
export function quoteSearchSubtitle(quote: { status: string; total: number; currency: string; deal?: { title: string } | null }): string {
  const parts = [QUOTE_STATUS[quote.status] ?? quote.status, money(quote.total, quote.currency)];
  if (quote.deal) parts.push(`Deal: ${quote.deal.title}`);
  else parts.push(quote.status === "PAGADA" ? "pagada sin deal: no sale en el historial" : "sin deal");
  return parts.join(" · ");
}
