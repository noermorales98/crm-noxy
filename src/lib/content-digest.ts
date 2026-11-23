// Sección «CONTENIDO» del resumen diario. Pura: recibe las piezas y el día local, devuelve líneas de texto.
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { parsePublishStatus, publishStatusLabel } from "./content-publish.ts";

export type DigestContentItem = {
  date: Date;
  title: string;
  publishStatus: string;
  clientName: string;
};

const dayKey = (date: Date) => date.toISOString().slice(0, 10);

function addDays(key: string, days: number): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return dayKey(d);
}

/** `todayKey` es el día local de la organización (YYYY-MM-DD); las piezas guardan su día en UTC. */
export function buildContentDigestLines(items: DigestContentItem[], todayKey: string, upcomingDays = 3): string[] {
  const pending = (item: DigestContentItem) => parsePublishStatus(item.publishStatus) !== "subido";
  const line = (item: DigestContentItem) => `  - ${item.clientName}: ${item.title} (${publishStatusLabel(item.publishStatus)})`;
  const lastDay = addDays(todayKey, upcomingDays);

  const today = items.filter((item) => dayKey(item.date) === todayKey);
  const upcoming = items.filter((item) => dayKey(item.date) > todayKey && dayKey(item.date) <= lastDay && pending(item));
  const overdue = items.filter((item) => dayKey(item.date) < todayKey && pending(item));

  const byStatus = new Map<string, number>();
  for (const item of [...today, ...upcoming]) {
    const label = publishStatusLabel(item.publishStatus);
    byStatus.set(label, (byStatus.get(label) ?? 0) + 1);
  }

  const lines = [`CONTENIDO: hoy ${today.length} | próximos ${upcomingDays} días ${upcoming.length} | atrasadas sin subir ${overdue.length}`];
  if (byStatus.size > 0) lines.push(`  Estados (hoy y próximos): ${[...byStatus].map(([label, n]) => `${label} ${n}`).join(", ")}`);
  if (today.length > 0) {
    lines.push(`SE SUBEN HOY: ${today.length}`, ...today.slice(0, 8).map(line));
  }
  if (upcoming.length > 0) {
    lines.push(`PENDIENTES PRÓXIMOS ${upcomingDays} DÍAS:`, ...upcoming.slice(0, 8).map((item) => `${line(item)} · ${dayKey(item.date).slice(5)}`));
  }
  if (overdue.length > 0) {
    lines.push(`ATRASADAS SIN SUBIR:`, ...overdue.slice(0, 5).map((item) => `${line(item)} · ${dayKey(item.date).slice(5)}`));
  }
  return lines;
}
