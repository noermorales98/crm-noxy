// Programaciones del asistente: «cada lunes dame el resumen» y alertas (deal sin movimiento, contenido atrasado, cobro vencido).
// Funciones puras, sin base de datos ni red.
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { isDigestDue, type DigestFrequency } from "./digest-schedule.ts";

export type AiScheduleKind = "prompt" | "stale_deals" | "late_content" | "overdue_payments" | "client_reports";

export type AiSchedule = {
  id: string;
  userId: string;
  name: string;
  kind: AiScheduleKind;
  /** Para `prompt`: lo que se le pide a la IA cada vez. */
  prompt: string;
  /** Para las alertas: cuántos días de retraso cuentan (por defecto 5). */
  days: number;
  frequency: Exclude<DigestFrequency, "custom">;
  weeklyDay: number;
  monthlyDay: number;
  hour: number;
  minute: number;
  enabled: boolean;
  lastRunAt: string | null;
  lastResult: string | null;
};

export const MAX_SCHEDULES_PER_USER = 10;
export const KINDS: AiScheduleKind[] = ["prompt", "stale_deals", "late_content", "overdue_payments", "client_reports"];
export const KIND_LABEL: Record<AiScheduleKind, string> = {
  prompt: "Pedirle algo a la IA",
  stale_deals: "Deals sin movimiento",
  late_content: "Contenido atrasado",
  overdue_payments: "Cobros vencidos",
  client_reports: "Informes mensuales de clientes",
};

const int = (v: unknown, min: number, max: number, fallback: number) => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.floor(n))) : fallback;
};

/** Valida lo que llega del formulario o de la IA. Devuelve la programación lista o el motivo por el que no vale. */
export function normalizeSchedule(input: unknown, userId: string, id: string): { ok: true; schedule: AiSchedule } | { ok: false; error: string } {
  const r = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const kind = KINDS.includes(r.kind as AiScheduleKind) ? (r.kind as AiScheduleKind) : "prompt";
  const prompt = typeof r.prompt === "string" ? r.prompt.trim().slice(0, 1500) : "";
  if (kind === "prompt" && !prompt) return { ok: false, error: "Escribe qué quieres que haga la IA." };
  const name = (typeof r.name === "string" && r.name.trim().slice(0, 60)) || KIND_LABEL[kind];
  const frequency = r.frequency === "weekly" || r.frequency === "monthly" ? r.frequency : "daily";
  return {
    ok: true,
    schedule: {
      id,
      userId,
      name,
      kind,
      prompt,
      days: int(r.days, 1, 90, 5),
      frequency,
      weeklyDay: int(r.weeklyDay, 0, 6, 1),
      monthlyDay: int(r.monthlyDay, 1, 28, 1),
      hour: int(r.hour, 0, 23, 8),
      minute: int(r.minute, 0, 59, 0),
      enabled: r.enabled !== false,
      lastRunAt: null,
      lastResult: null,
    },
  };
}

/** Lee lo guardado sin fiarse de su forma. */
export function parseSchedules(stored: string | null | undefined): AiSchedule[] {
  let raw: unknown;
  try {
    raw = JSON.parse(stored ?? "");
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  const out: AiSchedule[] = [];
  for (const item of raw) {
    const base = item as Record<string, unknown> | null;
    if (!base || typeof base.id !== "string" || typeof base.userId !== "string") continue;
    const n = normalizeSchedule(base, base.userId, base.id);
    if (!n.ok) continue;
    out.push({
      ...n.schedule,
      lastRunAt: typeof base.lastRunAt === "string" ? base.lastRunAt : null,
      lastResult: typeof base.lastResult === "string" ? base.lastResult.slice(0, 4000) : null,
    });
  }
  return out;
}

/** ¿Toca ejecutarla ahora? Misma regla que el resumen diario (ventana de 15 minutos, una vez por día, en la zona de la organización). */
export function isScheduleDue(s: AiSchedule, timezone: string, now = new Date()): boolean {
  return isDigestDue(
    { enabled: s.enabled, frequency: s.frequency, customDays: [], weeklyDay: s.weeklyDay, monthlyDay: s.monthlyDay, hour: s.hour, minute: s.minute, lastSentAt: s.lastRunAt ? new Date(s.lastRunAt) : null },
    timezone,
    now,
  );
}

const DAY_MS = 86_400_000;
const daysBetween = (from: Date, to: Date) => Math.floor((to.getTime() - from.getTime()) / DAY_MS);

/** Deals abiertos cuya última actividad (o actualización) es de hace `days` días o más. */
export function staleDealLines(deals: { title: string; updatedAt: Date; stageName: string; value: number | null }[], days: number, now: Date): string[] {
  return deals
    .map((d) => ({ d, age: daysBetween(d.updatedAt, now) }))
    .filter((x) => x.age >= days)
    .sort((a, b) => b.age - a.age)
    .map(({ d, age }) => `• ${d.title} (${d.stageName}) — ${age} días sin movimiento${d.value ? ` · $${d.value.toLocaleString("es-MX")}` : ""}`);
}

/** Piezas cuya fecha ya pasó hace `days` días o más y siguen sin aprobar ni subir. */
export function lateContentLines(items: { title: string; date: Date; clientName: string; publishStatus: string }[], days: number, now: Date): string[] {
  return items
    .filter((i) => i.publishStatus !== "subido" && i.publishStatus !== "aprobado")
    .map((i) => ({ i, age: daysBetween(i.date, now) }))
    .filter((x) => x.age >= days)
    .sort((a, b) => b.age - a.age)
    .map(({ i, age }) => `• ${i.title} — ${i.clientName} (${i.publishStatus}), ${age} días de retraso`);
}

/** Cobros pendientes cuyo vencimiento fue hace `days` días o más. */
export function overduePaymentLines(payments: { clientName: string; amount: number; currency: string; dueDate: Date | null; month: number; year: number }[], days: number, now: Date): string[] {
  return payments
    .filter((p) => p.dueDate)
    .map((p) => ({ p, age: daysBetween(p.dueDate as Date, now) }))
    .filter((x) => x.age >= days)
    .sort((a, b) => b.age - a.age)
    .map(({ p, age }) => `• ${p.clientName} — $${p.amount.toLocaleString("es-MX")} ${p.currency} (${p.month}/${p.year}), vencido hace ${age} días`);
}

/** Texto final de una alerta; vacío si no hay nada que avisar. */
export function alertMessage(kind: Exclude<AiScheduleKind, "prompt" | "client_reports">, lines: string[]): string {
  if (!lines.length) return "";
  const title = kind === "stale_deals" ? "Deals sin movimiento" : kind === "late_content" ? "Contenido atrasado" : "Cobros vencidos";
  return `${title} (${lines.length}):\n${lines.slice(0, 15).join("\n")}${lines.length > 15 ? `\n… y ${lines.length - 15} más` : ""}`;
}
