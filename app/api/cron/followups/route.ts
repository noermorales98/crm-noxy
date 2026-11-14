import { ensureLeadFollowups } from "@/src/lib/lead-followup-service";
import { shouldCloseSilentLead } from "@/src/lib/lead-followup";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { sendWhatsAppNotification } from "@/src/lib/whatsapp";

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
      await prisma.deal.updateMany({where:{id:lead.id,stageId:lead.stageId},data:{stageId:lost.id,lostReason:'Sin respuesta en 14 días; confirmar motivo'}});
      closedSilentLeads++;
    }
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Deals with follow-up due in the last 24h, not in won/lost stages
    const deals = await prisma.deal.findMany({
      where: {
        followUpAt: { gte: twentyFourHoursAgo, lte: now },
        stage: { isWon: false, isLost: false },
      },
      include: {
        contact: { select: { firstName: true, lastName: true } },
        organization: {
          include: {
            members: {
              where: { role: "OWNER" },
              include: {
                user: {
                  include: { callMeBot: true },
                },
              },
              take: 1,
            },
          },
        },
      },
    });

    let notified = 0;
    const errors: string[] = [];

    for (const deal of deals) {
      const owner = deal.organization.members[0]?.user;
      if (!owner?.callMeBot?.phone || !owner?.callMeBot?.apiKey) continue;

      const contactName = deal.contact
        ? `${deal.contact.firstName} ${deal.contact.lastName || ""}`.trim()
        : "Sin contacto";

      const tz = deal.organization.timezone || "America/Cancun";
      const followUpDate = deal.followUpAt
        ? new Intl.DateTimeFormat("es-MX", {
            timeZone: tz,
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(deal.followUpAt))
        : "";

      const message =
        `⏰ Follow-up vencido en Noxy CRM\n` +
        `📌 ${deal.title}\n` +
        `👤 ${contactName}\n` +
        `💰 $${deal.value ?? 0} ${deal.currency}\n` +
        `📅 Fecha: ${followUpDate}`;

      const sent = await sendWhatsAppNotification(owner.callMeBot.phone, owner.callMeBot.apiKey, message);
      if (sent) notified++;
      else errors.push(deal.id);
    }

    return NextResponse.json({
      processed: deals.length, followupTasksCreated, closedSilentLeads,
      notified,
      errors,
    });
  } catch (error) {
    console.error("GET /api/cron/followups error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
