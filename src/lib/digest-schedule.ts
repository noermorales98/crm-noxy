// Lógica pura del resumen diario: cuándo toca enviarlo, cuándo es el próximo envío,
// el texto de respaldo cuando la IA falla y cuándo avisar de un error. Sin base de datos.

export type DigestFrequency = "daily" | "weekly" | "monthly" | "custom";

export type DigestScheduleConfig = {
  enabled: boolean;
  frequency: DigestFrequency;
  customDays: number[];
  weeklyDay: number;
  monthlyDay: number;
  hour: number;
  minute: number;
};

type ZonedParts = { year: number; month: number; day: number; weekday: number; hour: number; minute: number };

export function getZonedParts(date: Date, timezone: string): ZonedParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: parseInt(get("year"), 10),
    month: parseInt(get("month"), 10),
    day: parseInt(get("day"), 10),
    weekday: weekdayMap[get("weekday")] ?? 0,
    hour: parseInt(get("hour"), 10) % 24,
    minute: parseInt(get("minute"), 10),
  };
}

export function isDigestDue(
  schedule: DigestScheduleConfig & { lastSentAt?: Date | null },
  timezone: string,
  now = new Date(),
  windowMinutes = 15,
): boolean {
  if (!schedule.enabled) return false;

  const z = getZonedParts(now, timezone);
  const scheduledMins = schedule.hour * 60 + schedule.minute;
  const currentMins = z.hour * 60 + z.minute;
  if (currentMins < scheduledMins || currentMins >= scheduledMins + windowMinutes) return false;

  if (schedule.lastSentAt) {
    const last = getZonedParts(schedule.lastSentAt, timezone);
    if (last.year === z.year && last.month === z.month && last.day === z.day) return false;
  }

  switch (schedule.frequency) {
    case "daily":
      return true;
    case "weekly":
      return z.weekday === schedule.weeklyDay;
    case "monthly":
      return z.day === schedule.monthlyDay;
    case "custom":
      return schedule.customDays.includes(z.weekday);
    default:
      return false;
  }
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Próximo envío programado, en la hora local de la organización.
 * Avanza de 5 en 5 minutos hasta 35 días y devuelve el primer momento en que `isDigestDue` daría true.
 * `dueNow` indica que ya estamos dentro de la ventana de envío.
 */
export function nextDigestRun(
  schedule: DigestScheduleConfig & { lastSentAt?: Date | null },
  timezone: string,
  now = new Date(),
): { date: string; time: string; dueNow: boolean } | null {
  if (!schedule.enabled) return null;
  const step = 5 * 60_000;
  for (let t = now.getTime(); t <= now.getTime() + 35 * 86_400_000; t += step) {
    const at = new Date(t);
    if (!isDigestDue(schedule, timezone, at)) continue;
    const z = getZonedParts(at, timezone);
    return { date: `${z.year}-${pad(z.month)}-${pad(z.day)}`, time: `${pad(schedule.hour)}:${pad(schedule.minute)}`, dueNow: t === now.getTime() };
  }
  return null;
}

const MAX_MESSAGE = 1500;

/**
 * Resumen sin IA: el contexto ya es texto ordenado, solo se limpia y se recorta.
 * Se usa cuando el modelo falla, para que el aviso llegue igual.
 */
export function fallbackDigestMessage(context: string): string {
  const lines = context
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line, index, all) => !(line === "" && (all[index - 1] === "" || index === 0)));
  let text = lines.join("\n").trim();
  if (text.length > MAX_MESSAGE) {
    const cut = text.slice(0, MAX_MESSAGE - 30);
    text = `${cut.slice(0, cut.lastIndexOf("\n") > 0 ? cut.lastIndexOf("\n") : cut.length)}\n… (resumen recortado)`;
  }
  return text;
}

/** Un error del resumen se avisa una vez por ventana, no cada vez que corre el cron (cada 15 min). */
export function shouldNotifyDigestError(lastNotifiedAt: Date | null | undefined, now: Date, quietHours = 6): boolean {
  if (!lastNotifiedAt) return true;
  return now.getTime() - lastNotifiedAt.getTime() >= quietHours * 3_600_000;
}
