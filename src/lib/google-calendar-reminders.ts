import { prisma } from "@/src/lib/db";
import { listGoogleCalendarEvents, type CalendarEventSummary } from "@/src/lib/google-calendar";
import { sendWhatsAppNotification } from "@/src/lib/whatsapp";

function formatEventDateTime(date: Date, tz: string) {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: tz,
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatEventTime(date: Date, tz: string) {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function isInWindow(eventStart: Date, now: Date, minMs: number, maxMs: number) {
  const diff = eventStart.getTime() - now.getTime();
  return diff >= minMs && diff <= maxMs;
}

function buildDayBeforeMessage(event: CalendarEventSummary, tz: string) {
  const when = formatEventDateTime(event.start, tz);
  const loc = event.location ? `\n📍 ${event.location}` : "";
  return `📅 Recordatorio de calendario\n\nMañana tienes:\n"${event.summary}"\n${when}${loc}`;
}

function buildMinutesBeforeMessage(event: CalendarEventSummary, minutes: number, tz: string) {
  const when = formatEventTime(event.start, tz);
  const loc = event.location ? `\n📍 ${event.location}` : "";
  return `🚨 Evento en ${minutes} min\n\n"${event.summary}"\nHoy a las ${when}${loc}`;
}

async function wasReminderSent(
  googleEventId: string,
  userId: string,
  reminderType: "day_before" | "minutes_before"
) {
  const existing = await prisma.googleCalendarReminderLog.findUnique({
    where: {
      googleEventId_userId_reminderType: { googleEventId, userId, reminderType },
    },
  });
  return !!existing;
}

async function logReminder(
  googleEventId: string,
  userId: string,
  organizationId: string,
  reminderType: "day_before" | "minutes_before",
  eventStart: Date
) {
  await prisma.googleCalendarReminderLog.create({
    data: { googleEventId, userId, organizationId, reminderType, eventStart },
  });
}

export async function runGoogleCalendarReminders(): Promise<{
  processed: number;
  sent: number;
  errors: string[];
}> {
  const now = new Date();
  const errors: string[] = [];
  let processed = 0;
  let sent = 0;

  const schedules = await prisma.digestSchedule.findMany({
    where: {
      OR: [{ calendarRemindDayBefore: true }, { calendarRemindMinutesBefore: { gt: 0 } }],
    },
    include: {
      user: { include: { callMeBot: true } },
      organization: {
        select: {
          id: true,
          timezone: true,
          googleCalendar: { select: { id: true } },
        },
      },
    },
  });

  for (const schedule of schedules) {
    processed++;
    const { user, organization } = schedule;
    const phone = user.callMeBot?.phone;
    const apiKey = user.callMeBot?.apiKey;

    if (!phone || !apiKey) continue;
    if (!organization.googleCalendar) continue;

    const maxMinutes = schedule.calendarRemindMinutesBefore > 0
      ? schedule.calendarRemindMinutesBefore + 10
      : 0;
    const fetchHorizonMs = Math.max(
      26 * 60 * 60 * 1000,
      maxMinutes * 60 * 1000
    );
    const events = await listGoogleCalendarEvents(
      organization.id,
      now,
      new Date(now.getTime() + fetchHorizonMs)
    );

    for (const event of events) {
      if (schedule.calendarRemindDayBefore) {
        const dayBeforeMin = (24 * 60 - 15) * 60 * 1000;
        const dayBeforeMax = (24 * 60 + 15) * 60 * 1000;
        if (isInWindow(event.start, now, dayBeforeMin, dayBeforeMax)) {
          const already = await wasReminderSent(event.id, user.id, "day_before");
          if (!already) {
            const msg = buildDayBeforeMessage(event, organization.timezone);
            const ok = await sendWhatsAppNotification(phone, apiKey, msg);
            if (ok) {
              await logReminder(event.id, user.id, organization.id, "day_before", event.start);
              sent++;
            } else {
              errors.push(`day_before ${event.id} user ${user.id}`);
            }
          }
        }
      }

      if (schedule.calendarRemindMinutesBefore > 0) {
        const mins = schedule.calendarRemindMinutesBefore;
        const minMs = Math.max(0, (mins - 3) * 60 * 1000);
        const maxMs = (mins + 3) * 60 * 1000;
        if (isInWindow(event.start, now, minMs, maxMs)) {
          const already = await wasReminderSent(event.id, user.id, "minutes_before");
          if (!already) {
            const msg = buildMinutesBeforeMessage(event, mins, organization.timezone);
            const ok = await sendWhatsAppNotification(phone, apiKey, msg);
            if (ok) {
              await logReminder(event.id, user.id, organization.id, "minutes_before", event.start);
              sent++;
            } else {
              errors.push(`minutes_before ${event.id} user ${user.id}`);
            }
          }
        }
      }
    }
  }

  return { processed, sent, errors };
}
