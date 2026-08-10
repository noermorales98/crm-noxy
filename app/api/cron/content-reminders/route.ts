import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { sendWhatsAppNotification } from "@/src/lib/whatsapp";
import { buildRecordingMessage } from "@/app/api/content/clients/[id]/notify/route";

// GET /api/cron/content-reminders
// Recorre las piezas de tipo "entrega" (día de grabación) de MAÑANA y avisa
// automáticamente a los números CallMeBot de cada cliente qué contenido debe
// grabar y con qué sugerencias. No repite avisos ya enviados (notifiedAt).
// Frecuencia sugerida en cron-job.org: 1 vez al día (ej. 8:00 am).
export async function GET(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization");
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const tomorrowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    const tomorrowEnd = new Date(tomorrowStart.getTime() + 24 * 60 * 60 * 1000);
    const twentyHoursAgo = new Date(now.getTime() - 20 * 60 * 60 * 1000);

    const items = await prisma.contentItem.findMany({
      where: {
        type: "entrega",
        date: { gte: tomorrowStart, lt: tomorrowEnd },
        // No reenviar si ya se avisó de esta pieza (manual o automático) en las últimas 20 h
        OR: [{ notifiedAt: null }, { notifiedAt: { lt: twentyHoursAgo } }],
        client: { isActive: true, phones: { some: {} } },
      },
      include: { client: { include: { phones: true } } },
    });

    let sent = 0;
    let failed = 0;
    const details: any[] = [];

    for (const item of items) {
      const message = buildRecordingMessage(item.client.name, item);
      for (const phone of item.client.phones) {
        const ok = await sendWhatsAppNotification(phone.phone, phone.apiKey, message);
        if (ok) sent++; else failed++;
        details.push({ client: item.client.name, item: item.title, phone: phone.phone, ok });
      }
      await prisma.contentItem.update({ where: { id: item.id }, data: { notifiedAt: new Date() } });
    }

    return NextResponse.json({
      message: "Recordatorios de contenido procesados",
      itemsDue: items.length,
      sent,
      failed,
      details,
    });
  } catch (error) {
    console.error("GET /api/cron/content-reminders error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
