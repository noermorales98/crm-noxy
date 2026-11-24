import { ensureLeadFollowups } from "@/src/lib/lead-followup-service";
import { shouldCloseSilentLead } from "@/src/lib/lead-followup";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { sendWhatsAppNotification } from "@/src/lib/whatsapp";
import { buildFollowUpMessage, shouldNotifyFollowUp } from "@/src/lib/followup-notify";
import { pickNotifyOwner } from "@/src/lib/org-owner";
import { closePendingMonthsForAll } from "@/src/lib/month-close-service";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if ((!cronSecret && process.env.NODE_ENV === "production") || (cronSecret && authHeader !== `Bearer ${cronSecret}`)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const rollout = new Date(process.env.CRM_AUTOMATION_START_AT || "2026-11-14T00:00:00Z");
    const leads = await prisma.deal.findMany({
      where: { stage: { name: "Lead" }, createdAt: { gte: rollout, lte: now }, isArchived: false },
      include: { stage: true, activities: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    let followupTasksCreated = 0;
    let closedSilentLeads = 0;
    for (const lead of leads) {
      followupTasksCreated += await ensureLeadFollowups(lead.id, lead.organizationId);
      if (!shouldCloseSilentLead({ createdAt: lead.createdAt, stageName: lead.stage.name, lastActivityAt: lead.activities[0]?.createdAt }, now)) continue;
      const lost = await prisma.stage.findFirst({where:{pipelineId:lead.stage.pipelineId,isLost:true}});
      if (!lost) continue;
      await prisma.deal.updateMany({where:{id:lead.id,stageId:lead.stageId},data:{stageId:lost.id,lostAt:new Date(),lostReason:'Sin respuesta en 14 días; confirmar motivo'}});
      closedSilentLeads++;
    }
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Seguimientos vencidos en las últimas 24 h, fuera de etapas ganada/perdida y sin archivar.
    const candidates = await prisma.deal.findMany({
      where: {
        followUpAt: { gte: twentyFourHoursAgo, lte: now },
        isArchived: false,
        stage: { isWon: false, isLost: false },
      },
      include: {
        contact: { select: { firstName: true, lastName: true } },
        organization: {
          include: {
            members: {
              where: { role: "OWNER" },
              include: { user: { include: { callMeBot: true } } },
              orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            },
          },
        },
      },
    });
    // Un seguimiento se avisa una sola vez: followUpNotifiedAt guarda el aviso y se limpia al cambiar la fecha.
    const deals = candidates.filter((deal) => shouldNotifyFollowUp(deal, now));

    // Un solo mensaje por organización (y destinatario), no uno por deal: los seguimientos de dos sub-cuentas nunca se mezclan.
    const byOwner = new Map<string, { phone: string; apiKey: string; organizationName: string; deals: typeof deals }>();
    for (const deal of deals) {
      const owner = pickNotifyOwner(deal.organization.members)?.user;
      if (!owner?.callMeBot?.phone || !owner.callMeBot.apiKey) continue;
      const key = `${deal.organizationId}:${owner.id}`;
      const group = byOwner.get(key) ?? { phone: owner.callMeBot.phone, apiKey: owner.callMeBot.apiKey, organizationName: deal.organization.name, deals: [] };
      group.deals.push(deal);
      byOwner.set(key, group);
    }

    let notified = 0;
    const errors: string[] = [];
    for (const group of byOwner.values()) {
      const message = buildFollowUpMessage(
        group.deals.map((deal) => ({ title: deal.title, contactName: deal.contact ? `${deal.contact.firstName} ${deal.contact.lastName || ""}`.trim() : null })),
        5,
        group.organizationName,
      );
      const sent = await sendWhatsAppNotification(group.phone, group.apiKey, message);
      if (sent) {
        notified += group.deals.length;
        await prisma.deal.updateMany({ where: { id: { in: group.deals.map((deal) => deal.id) } }, data: { followUpNotifiedAt: now } });
      } else {
        errors.push(...group.deals.map((deal) => deal.id));
      }
    }

    // Respaldo del cierre mensual (idempotente): corre también aquí por si el cron del resumen no está dado de alta.
    const monthlyClose = await closePendingMonthsForAll(now);

    return NextResponse.json({
      processed: deals.length, followupTasksCreated, closedSilentLeads,
      notified,
      errors,
      monthlyClose,
    });
  } catch (error) {
    console.error("GET /api/cron/followups error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
