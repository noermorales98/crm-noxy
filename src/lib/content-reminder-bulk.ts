import { prisma } from "@/src/lib/db";
import type { BulkReminderInput } from "@/src/lib/content-reminder-input";

/** Día (medianoche UTC) desde el que las piezas cuentan como «futuras». */
function startOfTodayUtc(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Al encender un cliente: activa el aviso de sus piezas futuras que aún no avisaron.
 * No toca piezas pasadas ni las ya notificadas (no se reenvía nada).
 */
export async function applyClientReminderSwitch(organizationId: string, clientIds: string[], now = new Date()) {
  const result = await prisma.contentItem.updateMany({
    where: { organizationId, clientId: { in: clientIds }, notifiedAt: null, reminderEnabled: false, date: { gte: startOfTodayUtc(now) } },
    data: { reminderEnabled: true },
  });
  return result.count;
}

export async function applyBulkReminders(organizationId: string, input: BulkReminderInput) {
  const clients = await prisma.contentClient.findMany({
    where: { organizationId, ...(input.clientIds === "all" ? {} : { id: { in: input.clientIds } }) },
    select: { id: true },
  });
  const ids = clients.map((client) => client.id);
  if (ids.length === 0) return { clients: 0, itemsEnabled: 0 };

  const data: Record<string, unknown> = { remindersEnabled: input.enabled };
  if (input.hour !== undefined) data.reminderHour = input.hour;
  if (input.minute !== undefined) data.reminderMinute = input.minute;
  if (input.daysBefore !== undefined) data.reminderDaysBefore = input.daysBefore;
  await prisma.contentClient.updateMany({ where: { organizationId, id: { in: ids } }, data });

  if (input.daysBefore !== undefined) {
    await prisma.contentItem.updateMany({
      where: { organizationId, clientId: { in: ids }, reminderEnabled: true, notifiedAt: null },
      data: { reminderDaysBefore: input.daysBefore },
    });
  }
  const itemsEnabled = input.enabled ? await applyClientReminderSwitch(organizationId, ids) : 0;
  return { clients: ids.length, itemsEnabled };
}
