// Estatus de cobro: PENDIENTE / RECIBIDO / VENCIDO. «Vencido» no se guarda: se calcula
// (PENDIENTE con fecha ya pasada), así nunca queda desfasado. Funciones puras.

export type PaymentLike = { status: string; dueDate: Date | string | null; dueAlertSentAt?: Date | string | null };
export const ALERT_DAYS_BEFORE = 2;
const DAY_MS = 86_400_000;

/** Día calendario (como entero de días) de «hoy» en la zona de la organización. */
export function localDayNumber(now: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const [y, m, d] = parts.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
}

/** Las fechas de cobro se guardan como fecha sin hora (medianoche UTC): se leen por sus partes UTC. */
function dueDayNumber(due: Date | string): number {
  const d = new Date(due);
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / DAY_MS);
}

export function daysUntilDue(payment: PaymentLike, now: Date, timezone: string): number | null {
  if (!payment.dueDate) return null;
  return dueDayNumber(payment.dueDate) - localDayNumber(now, timezone);
}

export type EffectiveStatus = "PENDIENTE" | "RECIBIDO" | "VENCIDO" | "CANCELADO";

export function effectivePaymentStatus(payment: PaymentLike, now: Date, timezone: string): EffectiveStatus {
  if (payment.status === "RECIBIDO") return "RECIBIDO";
  if (payment.status === "CANCELADO") return "CANCELADO";
  const days = daysUntilDue(payment, now, timezone);
  return days !== null && days < 0 ? "VENCIDO" : "PENDIENTE";
}

/** Avisa cuando faltan ≤2 días (y aún no vence), una sola vez por cobro. */
export function needsDueAlert(payment: PaymentLike, now: Date, timezone: string): boolean {
  if (payment.status !== "PENDIENTE" || payment.dueAlertSentAt) return false;
  const days = daysUntilDue(payment, now, timezone);
  return days !== null && days >= 0 && days <= ALERT_DAYS_BEFORE;
}

/** Fecha de cobro de una mensualidad sin dueDate: billingDay del mes (limitado al último día del mes). */
export function monthlyDueDate(input: { year: number; month: number; billingDay: number }): Date {
  const last = new Date(Date.UTC(input.year, input.month, 0)).getUTCDate();
  return new Date(Date.UTC(input.year, input.month - 1, Math.min(Math.max(input.billingDay, 1), last)));
}

export function dueAlertMessage(input: { who: string; amount: number; currency: string; days: number }): string {
  const when = input.days === 0 ? "hoy" : input.days === 1 ? "mañana" : `en ${input.days} días`;
  return `💸 Cobro por vencer ${when}\n👤 ${input.who}\n💰 $${input.amount} ${input.currency}`;
}
