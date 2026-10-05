import { prisma } from "@/src/lib/db";
import { getPublicBaseUrl } from "@/src/lib/url";
import { syncContentItemToCalendar, deleteGoogleCalendarEvent } from "@/src/lib/google-calendar";

function crmUrlFor(clientId: string): string | null {
  try {
    return `${getPublicBaseUrl()}/contenido/${clientId}`;
  } catch {
    return null;
  }
}

export async function pushContentItem(organizationId: string, itemId: string): Promise<boolean> {
  try {
    const item = await prisma.contentItem.findFirst({
      where: { id: itemId, organizationId },
      include: { client: { select: { id: true, name: true, color: true } } },
    });
    if (!item) return false;

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { timezone: true },
    });

    const eventId = await syncContentItemToCalendar(organizationId, {
      id: item.id,
      date: item.date,
      type: item.type,
      title: item.title,
      time: item.time,
      hook: item.hook,
      caption: item.caption,
      googleEventId: item.googleEventId,
      clientId: item.client.id,
      clientName: item.client.name,
      clientColor: item.client.color,
      timeZone: org?.timezone || "America/Cancun",
      crmUrl: crmUrlFor(item.client.id),
    });
    if (!eventId) return false;
    if (eventId !== item.googleEventId) {
      await prisma.contentItem.update({
        where: { id: item.id },
        data: { googleEventId: eventId },
      });
    }
    return true;
  } catch (err) {
    console.error("[content-google-sync] Failed to push item:", err);
    return false;
  }
}

export async function removeContentItemEvent(organizationId: string, googleEventId: string | null): Promise<void> {
  if (!googleEventId) return;
  try {
    await deleteGoogleCalendarEvent(organizationId, googleEventId);
  } catch (err) {
    console.error("[content-google-sync] Failed to delete event:", err);
  }
}

export async function resyncClientContentEvents(organizationId: string, clientId: string): Promise<void> {
  const items = await prisma.contentItem.findMany({
    where: { clientId, organizationId, googleEventId: { not: null } },
    select: { id: true },
  });
  for (const item of items) {
    await pushContentItem(organizationId, item.id);
  }
}

export async function contentGoogleSyncStatus(organizationId: string) {
  const [token, pending] = await Promise.all([
    prisma.googleCalendarToken.findUnique({
      where: { organizationId },
      select: { id: true },
    }),
    prisma.contentItem.count({
      where: { organizationId, googleEventId: null },
    }),
  ]);
  return { connected: Boolean(token), pending };
}

export async function syncPendingContentItems(organizationId: string) {
  const status = await contentGoogleSyncStatus(organizationId);
  if (!status.connected) return { connected: false, synced: 0, failed: 0, pending: status.pending };

  const items = await prisma.contentItem.findMany({
    where: { organizationId, googleEventId: null },
    select: { id: true },
    orderBy: { date: "asc" },
  });

  let synced = 0;
  let failed = 0;
  for (const item of items) {
    if (await pushContentItem(organizationId, item.id)) synced += 1;
    else failed += 1;
  }
  return { connected: true, synced, failed, pending: failed };
}
