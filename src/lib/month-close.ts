// Cierre mensual de ventas: funciones puras (meses en la zona de la organización y métricas de la foto).
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { effectiveDealValue, type Money } from "./deal-sales.ts";

export type MonthKey = string; // "YYYY-MM"

export const parseMonthKey = (key: MonthKey): { year: number; month: number } | null => {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(key);
  return match ? { year: Number(match[1]), month: Number(match[2]) } : null;
};

export const toMonthKey = (year: number, month: number): MonthKey => `${year}-${String(month).padStart(2, "0")}`;

export function previousMonthKey(key: MonthKey): MonthKey {
  const { year, month } = parseMonthKey(key)!;
  return month === 1 ? toMonthKey(year - 1, 12) : toMonthKey(year, month - 1);
}

export function nextMonthKey(key: MonthKey): MonthKey {
  const { year, month } = parseMonthKey(key)!;
  return month === 12 ? toMonthKey(year + 1, 1) : toMonthKey(year, month + 1);
}

/** Mes (YYYY-MM) en el que cae un instante, visto desde la zona horaria `timeZone`. */
export function monthKeyInZone(date: Date, timeZone: string): MonthKey {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit" }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}`;
}

function zoneOffsetMs(at: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(at));
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second")) - at;
}

/** Instante UTC en que empieza el mes `key` en la zona `timeZone`. */
export function monthStartUtc(key: MonthKey, timeZone: string): Date {
  const { year, month } = parseMonthKey(key)!;
  const guess = Date.UTC(year, month - 1, 1);
  const first = guess - zoneOffsetMs(guess, timeZone);
  return new Date(guess - zoneOffsetMs(first, timeZone));
}

/** Rango [desde, hasta) del mes en UTC. */
export function monthRangeInZone(key: MonthKey, timeZone: string): { from: Date; to: Date } {
  return { from: monthStartUtc(key, timeZone), to: monthStartUtc(nextMonthKey(key), timeZone) };
}

/** Meses desde `fromKey` hasta `toKey`, ambos incluidos, con tope de seguridad. */
export function monthKeysBetween(fromKey: MonthKey, toKey: MonthKey, cap = 36): MonthKey[] {
  const keys: MonthKey[] = [];
  for (let key = fromKey; key <= toKey && keys.length < cap; key = nextMonthKey(key)) keys.push(key);
  return keys;
}

export type MonthWonDeal = {
  value: number | null;
  currency: string;
  quotes: { status: string; total: number; currency: string }[];
};

export type MonthMetrics = {
  month: MonthKey;
  created: number;
  won: { count: number; byCurrency: Money };
  lost: { count: number };
  /** Ganados ÷ (ganados + perdidos) del mes, en %. null si no hubo cierres. */
  closingRate: number | null;
  withQuote: number;
  withoutQuote: number;
  paymentsReceived: Money;
  /** Solo en cierres hechos en su momento: lo abierto cuando se cerró el mes. */
  openAtClose?: { count: number; byCurrency: Money };
};

const add = (bucket: Money, currency: string, amount: number) => {
  bucket[currency] = (bucket[currency] ?? 0) + amount;
};

export function buildMonthMetrics(input: {
  month: MonthKey;
  created: number;
  won: MonthWonDeal[];
  lostCount: number;
  payments: { amount: number; currency: string }[];
  open?: { value: number | null; currency: string }[];
}): MonthMetrics {
  const won: MonthMetrics["won"] = { count: 0, byCurrency: {} };
  let withQuote = 0;
  for (const deal of input.won) {
    const { amount, currency } = effectiveDealValue(deal);
    won.count++;
    add(won.byCurrency, currency, amount);
    if (deal.quotes.length) withQuote++;
  }
  const paymentsReceived: Money = {};
  for (const payment of input.payments) add(paymentsReceived, payment.currency, payment.amount);

  const closed = won.count + input.lostCount;
  const metrics: MonthMetrics = {
    month: input.month,
    created: input.created,
    won,
    lost: { count: input.lostCount },
    closingRate: closed > 0 ? Math.round((won.count / closed) * 100) : null,
    withQuote,
    withoutQuote: won.count - withQuote,
    paymentsReceived,
  };
  if (input.open) {
    const byCurrency: Money = {};
    for (const deal of input.open) add(byCurrency, deal.currency, deal.value ?? 0);
    metrics.openAtClose = { count: input.open.length, byCurrency };
  }
  return metrics;
}

/**
 * ¿Se archiva un deal ganado al cerrar su mes? Solo los de la etapa ganada FINAL de su pipeline
 * (p. ej. «Entregado») o la etapa legado «Ganado»: un deal en «En producción» sigue siendo trabajo vivo.
 */
export function isFinalWonStage(stage: { order: number; name: string }, maxWonOrderInPipeline: number): boolean {
  return stage.order >= maxWonOrderInPipeline || stage.name.trim().toLowerCase() === "ganado";
}
