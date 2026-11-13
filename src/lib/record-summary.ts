// Cifras de las fichas de contacto y de cliente. Funciones puras: la página solo las muestra.

import type { Money } from "./deal-sales";

type DealLike = { value: number | null; currency: string; stage: { isWon: boolean; isLost: boolean } };
type QuoteLike = { status: string; total: number; currency: string };
type AppointmentLike = { startTime: Date; status: string };

export type ContactSummary = {
  openLeads: number;
  wonLeads: number;
  wonByCurrency: Money;
  quotes: number;
  paidByCurrency: Money;
  nextAppointment: Date | null;
};

const add = (bucket: Money, currency: string, amount: number) => {
  bucket[currency] = (bucket[currency] ?? 0) + amount;
};

export function summarizeContact(
  data: { deals: DealLike[]; quotes: QuoteLike[]; appointments: AppointmentLike[] },
  now = new Date(),
): ContactSummary {
  const summary: ContactSummary = { openLeads: 0, wonLeads: 0, wonByCurrency: {}, quotes: data.quotes.length, paidByCurrency: {}, nextAppointment: null };
  for (const deal of data.deals) {
    if (deal.stage.isWon) {
      summary.wonLeads++;
      add(summary.wonByCurrency, deal.currency, deal.value ?? 0);
    } else if (!deal.stage.isLost) {
      summary.openLeads++;
    }
  }
  for (const quote of data.quotes) if (quote.status === "PAGADA") add(summary.paidByCurrency, quote.currency, quote.total);
  const upcoming = data.appointments
    .filter((appointment) => appointment.status !== "CANCELLED" && appointment.startTime >= now)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  summary.nextAppointment = upcoming[0]?.startTime ?? null;
  return summary;
}

export type PaymentsSummary = { count: number; received: number; pending: number; late: number };

/** Pagos de un cliente de mensualidad: cobrado, por cobrar y cuántos pendientes ya pasaron su fecha. */
export function summarizeClientPayments(
  payments: { amount: number; status: string; dueDate: Date | null }[],
  now = new Date(),
): PaymentsSummary {
  const summary: PaymentsSummary = { count: payments.length, received: 0, pending: 0, late: 0 };
  for (const payment of payments) {
    if (payment.status === "RECIBIDO") summary.received += payment.amount;
    else if (payment.status === "PENDIENTE") {
      summary.pending += payment.amount;
      if (payment.dueDate && payment.dueDate < now) summary.late++;
    }
  }
  return summary;
}
