// Informe mensual de un cliente de la agencia: datos reunidos y su texto en Markdown. Funciones puras (sin base de datos).

export type ReportMonth = { year: number; month: number }; // month 1-12

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export const monthLabel = ({ year, month }: ReportMonth) => `${MONTHS[month - 1] ?? month} ${year}`;

/** El mes anterior al de `now` (el que se informa al cierre). */
export function previousMonth(now: Date): ReportMonth {
  const m = now.getUTCMonth(); // 0-11 del mes actual
  return m === 0 ? { year: now.getUTCFullYear() - 1, month: 12 } : { year: now.getUTCFullYear(), month: m };
}

/** Primer día del mes y del siguiente (UTC), para filtrar por fechas. */
export function monthRange({ year, month }: ReportMonth): { from: Date; to: Date } {
  return { from: new Date(Date.UTC(year, month - 1, 1)), to: new Date(Date.UTC(year, month, 1)) };
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
/** ¿Es el mismo cliente con distinto formato («Café Luna» y «cafe luna»)? */
export const sameName = (a: string, b: string) => norm(a) === norm(b);

export type ReportData = {
  clientName: string;
  period: ReportMonth;
  currency: string;
  monthlyFee: number;
  payments: { amount: number; status: "PENDIENTE" | "RECIBIDO" | "CANCELADO"; receivedAt: string | null }[];
  content: { delivered: { title: string; type: string; date: string }[]; pending: number } | null;
  videos: { title: string; platform: string; views: number | null; leads: number | null }[];
};

const money = (n: number, currency: string) => `$${n.toLocaleString("es-MX")} ${currency}`;

/** Totales del mes para el resumen. */
export function paymentTotals(payments: ReportData["payments"]) {
  const received = payments.filter((p) => p.status === "RECIBIDO").reduce((s, p) => s + p.amount, 0);
  const pending = payments.filter((p) => p.status === "PENDIENTE").reduce((s, p) => s + p.amount, 0);
  return { received, pending };
}

/** Informe en Markdown: solo lo que hay en los datos; las secciones sin datos lo dicen en vez de inventar. */
export function renderClientReport(d: ReportData): string {
  const { received, pending } = paymentTotals(d.payments);
  const L: string[] = [`# Informe de ${monthLabel(d.period)} — ${d.clientName}`, ""];

  L.push("## Resumen", "");
  L.push(`- Cuota mensual: ${money(d.monthlyFee, d.currency)}`);
  L.push(`- Cobrado en el mes: ${money(received, d.currency)}`);
  if (pending > 0) L.push(`- Pendiente de cobro: ${money(pending, d.currency)}`);
  if (d.content) L.push(`- Piezas de contenido entregadas: ${d.content.delivered.length}${d.content.pending ? ` (quedan ${d.content.pending} sin subir)` : ""}`);
  L.push(`- Videos con resultados: ${d.videos.length}`, "");

  L.push("## Contenido entregado", "");
  if (!d.content) L.push("_No hay un cliente de contenido con este nombre, así que no se pudo incluir el calendario._");
  else if (!d.content.delivered.length) L.push("_No se subieron piezas este mes._");
  else for (const i of d.content.delivered) L.push(`- ${i.date} · ${i.type} · ${i.title}`);
  L.push("");

  L.push("## Resultados de los videos", "");
  if (!d.videos.length) L.push("_Sin videos registrados en el mes._");
  else {
    const withViews = d.videos.filter((v) => v.views != null);
    const totalViews = withViews.reduce((s, v) => s + (v.views ?? 0), 0);
    const totalLeads = d.videos.reduce((s, v) => s + (v.leads ?? 0), 0);
    L.push(`Vistas totales: ${totalViews.toLocaleString("es-MX")} · Leads: ${totalLeads}`, "");
    for (const v of [...d.videos].sort((a, b) => (b.views ?? 0) - (a.views ?? 0))) {
      L.push(`- ${v.title} (${v.platform})${v.views != null ? ` — ${v.views.toLocaleString("es-MX")} vistas` : ""}${v.leads ? `, ${v.leads} leads` : ""}`);
    }
  }
  L.push("", "## Cobros", "");
  if (!d.payments.length) L.push("_No hay cobros registrados para este mes._");
  else for (const p of d.payments) L.push(`- ${money(p.amount, d.currency)} — ${p.status === "RECIBIDO" ? `recibido${p.receivedAt ? ` el ${p.receivedAt}` : ""}` : p.status === "PENDIENTE" ? "pendiente" : "cancelado"}`);
  return L.join("\n");
}
