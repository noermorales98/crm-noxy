import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { isDigestDue, runDigestForUser, type DigestFrequency } from "@/src/lib/digest";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
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
    const errors: string[] = [];

    for (const schedule of schedules) {
      processed++;
      if (!schedule.user.callMeBot?.phone || !schedule.user.callMeBot.apiKey) {
        errors.push(`${schedule.userId}: sin WhatsApp`);
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
      } catch (e: any) {
        errors.push(`${schedule.userId}: ${e.message}`);
      }
    }

    return NextResponse.json({ processed, sent, errors });
  } catch (error) {
    console.error("GET /api/cron/digest error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
