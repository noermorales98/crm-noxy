// Resumen del modo Contenido: qué hay para hoy, qué está atrasado, qué falta por subir y cómo va cada
// cliente. Puro (recibe las piezas y el día de hoy) para poder probarlo sin base de datos.

export type ContentItemLike = {
  id: string;
  title: string;
  type: string;
  publishStatus: string;
  /** Día de la pieza (medianoche UTC). */
  date: string | Date;
  time: string | null;
  clientId: string;
  clientName: string;
};

export type ContentClientLike = { id: string; name: string; color: string };

export type ClientHealth = { id: string; name: string; color: string; total: number; overdue: number; today: number; upcoming: number; idle: boolean };

export type ContentSummary = {
  today: ContentItemLike[];
  overdue: ContentItemLike[];
  upcoming: ContentItemLike[];
  perClient: ClientHealth[];
  counts: { today: number; overdue: number; toUpload: number; inEditing: number; pending: number; thisWeek: number; idleClients: number };
};

const dayKey = (date: string | Date) => new Date(date).toISOString().slice(0, 10);

function addDays(key: string, days: number): string {
  const d = new Date(`${key}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** «9:00 am» → minutos del día, para ordenar; sin hora, al final. */
function minutesOf(time: string | null): number {
  const match = /^(\d{1,2}):(\d{2})\s*(am|pm)?$/i.exec(time?.trim() ?? "");
  if (!match) return 24 * 60;
  let hour = Number(match[1]) % 12;
  if (match[3]?.toLowerCase() === "pm" || (!match[3] && Number(match[1]) >= 12)) hour += 12;
  if (!match[3] && Number(match[1]) < 12) hour = Number(match[1]);
  return hour * 60 + Number(match[2]);
}

export function summarizeContent(items: readonly ContentItemLike[], clients: readonly ContentClientLike[], todayKey: string): ContentSummary {
  const weekEnd = addDays(todayKey, 7);
  const open = items.filter((item) => item.publishStatus !== "subido");

  const overdue = open.filter((item) => dayKey(item.date) < todayKey).sort((a, b) => dayKey(a.date).localeCompare(dayKey(b.date)));
  const today = open.filter((item) => dayKey(item.date) === todayKey).sort((a, b) => minutesOf(a.time) - minutesOf(b.time));
  const upcoming = open
    .filter((item) => dayKey(item.date) > todayKey && dayKey(item.date) <= weekEnd)
    .sort((a, b) => dayKey(a.date).localeCompare(dayKey(b.date)) || minutesOf(a.time) - minutesOf(b.time));

  const perClient: ClientHealth[] = clients.map((client) => {
    const own = open.filter((item) => item.clientId === client.id);
    const o = own.filter((item) => dayKey(item.date) < todayKey).length;
    const t = own.filter((item) => dayKey(item.date) === todayKey).length;
    const u = own.filter((item) => dayKey(item.date) > todayKey).length;
    return { id: client.id, name: client.name, color: client.color, total: own.length, overdue: o, today: t, upcoming: u, idle: own.length === 0 };
  });
  perClient.sort((a, b) => b.overdue - a.overdue || b.today - a.today || Number(a.idle) - Number(b.idle) || a.name.localeCompare(b.name));

  return {
    today,
    overdue,
    upcoming,
    perClient,
    counts: {
      today: today.length,
      overdue: overdue.length,
      toUpload: open.filter((item) => item.publishStatus === "editado").length,
      inEditing: open.filter((item) => item.publishStatus === "en_edicion").length,
      pending: open.filter((item) => item.publishStatus === "pendiente").length,
      thisWeek: today.length + upcoming.length,
      idleClients: perClient.filter((client) => client.idle).length,
    },
  };
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Línea de estado del encabezado: lo más urgente primero. */
export function contentGreeting(summary: ContentSummary): string {
  const { overdue, today, toUpload } = summary.counts;
  if (overdue > 0) return `Tienes ${plural(overdue, "pieza atrasada", "piezas atrasadas")} por resolver.`;
  if (today > 0) return `Tienes ${plural(today, "pieza para hoy", "piezas para hoy")}.`;
  if (toUpload > 0) return `${plural(toUpload, "pieza lista", "piezas listas")} para subir.`;
  return "Estás al día: sin piezas pendientes por ahora.";
}
