import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { isDigestDue, runDigestForUser, type DigestFrequency } from "@/src/lib/digest";
import { closePendingMonthsForAll } from "@/src/lib/month-close-service";
import { shouldNotifyDigestError } from "@/src/lib/digest-schedule";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if ((!cronSecret && process.env.NODE_ENV === "production") || (cronSecret && authHeader !== `Bearer ${cronSecret}`)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const schedules = await prisma.digestSchedule.findMany({
      where: { enabled: true },
      include: {
        user: { include: { callMeBot: true } },
        organization: { select: { timezone: true, name: true } },
      },
    });

    let processed = 0;
    let sent = 0;
    let fallbacks = 0;
    const errors: string[] = [];

    // El error se avisa en la campanita, pero una vez cada 6 h por organización: el cron corre cada 15 min.
    const notifyError = async (organizationId: string, detail: string) => {
      try {
        const last = await prisma.notification.findFirst({
          where: { organizationId, type: "DIGEST_ERROR" },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        });
        if (!shouldNotifyDigestError(last?.createdAt, new Date())) return;
        await prisma.notification.create({
          data: { organizationId, type: "DIGEST_ERROR", title: "No se pudo enviar tu resumen diario", body: detail, link: "/settings/digest" },
        });
      } catch (notifyFailure) {
        console.error("[cron/digest] no se pudo guardar el aviso de error:", notifyFailure);
      }
    };

    for (const schedule of schedules) {
      processed++;
      if (!schedule.user.callMeBot?.phone || !schedule.user.callMeBot.apiKey) {
        errors.push(`${schedule.userId}: sin WhatsApp`);
        await notifyError(schedule.organizationId, "Falta configurar WhatsApp (CallMeBot) en Configuración → Integraciones.");
        continue;
      }

      const config = {
        enabled: schedule.enabled,
        frequency: schedule.frequency as DigestFrequency,
        customDays: schedule.customDays ? JSON.parse(schedule.customDays) : [],
        weeklyDay: schedule.weeklyDay,
        monthlyDay: schedule.monthlyDay,
        hour: schedule.hour,
        minute: schedule.minute,
        lastSentAt: schedule.lastSentAt,
      };

      if (!isDigestDue(config, schedule.organization.timezone)) continue;

      try {
        const result = await runDigestForUser(schedule.userId, schedule.organizationId, {
          sendWhatsApp: true,
          skipScheduleCheck: true,
        });
        if (result.sent) sent++;
        if (result.usedFallback) fallbacks++;
      } catch (e: any) {
        console.error(`[cron/digest] fallo para ${schedule.userId}:`, e);
        errors.push(`${schedule.userId}: ${e.message}`);
        await notifyError(schedule.organizationId, e.message || "Error desconocido al enviar el resumen.");
      }
    }

    // Reciclamos este cron (cada 15 min): el cierre mensual es idempotente y solo actúa si falta una foto.
    const monthlyClose = await closePendingMonthsForAll();

    return NextResponse.json({ processed, sent, fallbacks, errors, monthlyClose });
  } catch (error) {
    console.error("GET /api/cron/digest error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
