import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { parseCustomDays } from "@/src/lib/digest";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const orgId = (session as any).currentOrganizationId as string | undefined;
    if (!orgId) return NextResponse.json({ error: "Sin organización" }, { status: 400 });

    const schedule = await prisma.digestSchedule.findUnique({
      where: { userId_organizationId: { userId: session.user.id, organizationId: orgId } },
    });

    const callMeBot = await prisma.callMeBot.findUnique({ where: { userId: session.user.id } });
    const googleConnected = await prisma.googleCalendarToken.findUnique({
      where: { organizationId: orgId },
      select: { id: true },
    });

    let customDays: number[] = [1, 2, 3, 4, 5];
    if (schedule?.customDays) {
      try {
        customDays = JSON.parse(schedule.customDays);
      } catch {
        customDays = [1, 2, 3, 4, 5];
      }
    }

    return NextResponse.json({
      enabled: schedule?.enabled ?? false,
      frequency: schedule?.frequency ?? "daily",
      customDays,
      weeklyDay: schedule?.weeklyDay ?? 1,
      monthlyDay: schedule?.monthlyDay ?? 1,
      hour: schedule?.hour ?? 8,
      minute: schedule?.minute ?? 0,
      lastSentAt: schedule?.lastSentAt ?? null,
      includeGoogleCalendar: schedule?.includeGoogleCalendar ?? true,
      includeUnreadEmails: schedule?.includeUnreadEmails ?? true,
      calendarRemindDayBefore: schedule?.calendarRemindDayBefore ?? true,
      calendarRemindMinutesBefore: schedule?.calendarRemindMinutesBefore ?? 15,
      aiModelId: schedule?.aiModelId ?? "chatbase",
      whatsappConfigured: !!(callMeBot?.phone && callMeBot?.apiKey),
      googleCalendarConnected: !!googleConnected,
    });
  } catch (err) {
    console.error("[settings/digest GET]", err);
    return NextResponse.json({ error: "Error al cargar configuración" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const orgId = (session as any).currentOrganizationId as string | undefined;
    if (!orgId) return NextResponse.json({ error: "Sin organización" }, { status: 400 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Cuerpo de solicitud inválido" }, { status: 400 });

    const {
      enabled,
      frequency,
      customDays,
      weeklyDay,
      monthlyDay,
      hour,
      minute,
      includeGoogleCalendar,
      includeUnreadEmails,
      calendarRemindDayBefore,
      calendarRemindMinutesBefore,
      aiModelId,
    } = body;

    const parsedDays = parseCustomDays(customDays);
    const parsedMinutes =
      typeof calendarRemindMinutesBefore === "number"
        ? Math.min(120, Math.max(0, calendarRemindMinutesBefore))
        : 15;
    const parsedModelId =
      typeof aiModelId === "string" && aiModelId.trim() ? aiModelId.trim() : "chatbase";

    const schedule = await prisma.digestSchedule.upsert({
      where: { userId_organizationId: { userId: session.user.id, organizationId: orgId } },
      update: {
        enabled: !!enabled,
        frequency: frequency || "daily",
        customDays: JSON.stringify(parsedDays),
        weeklyDay: typeof weeklyDay === "number" ? weeklyDay : 1,
        monthlyDay: typeof monthlyDay === "number" ? Math.min(28, Math.max(1, monthlyDay)) : 1,
        hour: typeof hour === "number" ? Math.min(23, Math.max(0, hour)) : 8,
        minute: typeof minute === "number" ? Math.min(59, Math.max(0, minute)) : 0,
        includeGoogleCalendar: includeGoogleCalendar !== false,
        includeUnreadEmails: includeUnreadEmails !== false,
        calendarRemindDayBefore: calendarRemindDayBefore !== false,
        calendarRemindMinutesBefore: parsedMinutes,
        aiModelId: parsedModelId,
      },
      create: {
        userId: session.user.id,
        organizationId: orgId,
        enabled: !!enabled,
        frequency: frequency || "daily",
        customDays: JSON.stringify(parsedDays),
        weeklyDay: typeof weeklyDay === "number" ? weeklyDay : 1,
        monthlyDay: typeof monthlyDay === "number" ? Math.min(28, Math.max(1, monthlyDay)) : 1,
        hour: typeof hour === "number" ? Math.min(23, Math.max(0, hour)) : 8,
        minute: typeof minute === "number" ? Math.min(59, Math.max(0, minute)) : 0,
        includeGoogleCalendar: includeGoogleCalendar !== false,
        includeUnreadEmails: includeUnreadEmails !== false,
        calendarRemindDayBefore: calendarRemindDayBefore !== false,
        calendarRemindMinutesBefore: parsedMinutes,
        aiModelId: parsedModelId,
      },
    });

    let parsedCustomDays: number[] = [];
    try {
      parsedCustomDays = JSON.parse(schedule.customDays || "[]");
    } catch {
      parsedCustomDays = parsedDays;
    }

    return NextResponse.json({
      enabled: schedule.enabled,
      frequency: schedule.frequency,
      customDays: parsedCustomDays,
      weeklyDay: schedule.weeklyDay,
      monthlyDay: schedule.monthlyDay,
      hour: schedule.hour,
      minute: schedule.minute,
      lastSentAt: schedule.lastSentAt,
      includeGoogleCalendar: schedule.includeGoogleCalendar,
      includeUnreadEmails: schedule.includeUnreadEmails,
      calendarRemindDayBefore: schedule.calendarRemindDayBefore,
      calendarRemindMinutesBefore: schedule.calendarRemindMinutesBefore,
      aiModelId: schedule.aiModelId,
    });
  } catch (err) {
    console.error("[settings/digest PATCH]", err);
    const detail = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? `Error al guardar configuración: ${detail}`
            : "Error al guardar configuración",
      },
      { status: 500 }
    );
  }
}
