import { prisma } from "@/src/lib/db";
import { sendCallMeBotMessage } from "@/src/lib/whatsapp";
import { buildRecordingMessage } from "@/app/api/content/clients/[id]/notify/route";

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function getZonedParts(date: Date, timezone: string): ZonedParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  return {
    year: parseInt(get("year"), 10),
    month: parseInt(get("month"), 10),
    day: parseInt(get("day"), 10),
    hour: parseInt(get("hour"), 10) % 24,
    minute: parseInt(get("minute"), 10),
  };
}

/** Fecha UTC del ítem (día calendario) como YYYY-MM-DD. */
export function itemDateKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Día objetivo del recordatorio = fecha de la pieza − daysBefore (calendario UTC). */
export function reminderTargetDateKey(itemDate: Date, daysBefore: number): string {
  const target = new Date(
    Date.UTC(itemDate.getUTCFullYear(), itemDate.getUTCMonth(), itemDate.getUTCDate() - daysBefore)
  );
  return itemDateKey(target);
}

function todayKeyInTimezone(now: Date, timezone: string): string {
  const z = getZonedParts(now, timezone);
  return `${z.year}-${String(z.month).padStart(2, "0")}-${String(z.day).padStart(2, "0")}`;
}

function isWithinReminderWindow(
  hour: number,
  minute: number,
  timezone: string,
  now: Date,
  windowMinutes = 15
): boolean {
  const z = getZonedParts(now, timezone);
  const scheduledMins = hour * 60 + minute;
  const currentMins = z.hour * 60 + z.minute;
  return currentMins >= scheduledMins && currentMins < scheduledMins + windowMinutes;
}

/**
 * Envía recordatorios WhatsApp de piezas con reminderEnabled.
 * Para cada cliente activo con números, si la hora actual cae en su ventana
 * reminderHour:reminderMinute (±15 min, timezone de la org), avisa las piezas
 * cuyo día de aviso (date − reminderDaysBefore) es hoy.
 */
export async function runContentReminders(now = new Date()) {
  const clients = await prisma.contentClient.findMany({
    where: {
      isActive: true,
      phones: { some: {} },
      items: { some: { reminderEnabled: true, notifiedAt: null } },
    },
    include: {
      phones: true,
      organization: { select: { timezone: true } },
      items: {
        where: { reminderEnabled: true, notifiedAt: null },
      },
    },
  });

  let sent = 0;
  let failed = 0;
  let skippedSchedule = 0;
  const details: {
    client: string;
    item: string;
    phone: string;
    ok: boolean;
    error?: string;
    daysBefore?: number;
  }[] = [];

  for (const client of clients) {
    const timezone = client.organization.timezone || "America/Mexico_City";
    if (
      !isWithinReminderWindow(client.reminderHour, client.reminderMinute, timezone, now)
    ) {
      skippedSchedule++;
      continue;
    }

    const todayKey = todayKeyInTimezone(now, timezone);
    const dueItems = client.items.filter(
      (item) => reminderTargetDateKey(item.date, item.reminderDaysBefore) === todayKey
    );

    for (const item of dueItems) {
      const message = buildRecordingMessage(client.name, item, {
        daysBefore: item.reminderDaysBefore,
      });
      let anyOk = false;
      for (const phone of client.phones) {
        const result = await sendCallMeBotMessage(phone.phone, phone.apiKey, message);
        if (result.ok) {
          sent++;
          anyOk = true;
        } else {
          failed++;
        }
        details.push({
          client: client.name,
          item: item.title,
          phone: phone.phone,
          ok: result.ok,
          error: result.error,
          daysBefore: item.reminderDaysBefore,
        });
      }
      if (anyOk) {
        await prisma.contentItem.update({
          where: { id: item.id },
          data: { notifiedAt: new Date() },
        });
      }
    }
  }

  return {
    clientsChecked: clients.length,
    skippedSchedule,
    sent,
    failed,
    details,
  };
}
