import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";
import { processCampaignEmails } from "@/src/lib/process-campaign-emails";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOrganizationId = (session as any).currentOrganizationId;
    if (!currentOrganizationId) {
      return NextResponse.json({ error: "No organization context" }, { status: 400 });
    }

    const body = await req.json();
    const { campaignId } = body;

    if (!campaignId) {
      return NextResponse.json({ error: "Campaign ID is required" }, { status: 400 });
    }

    // Verify campaign belongs to the organization and is currently DRAFT
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id: campaignId },
      include: { steps: { orderBy: { order: "asc" } } },
    });

    if (!campaign || campaign.organizationId !== currentOrganizationId) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (campaign.status !== "DRAFT") {
      return NextResponse.json({ error: "Campaign is already processing or sent" }, { status: 400 });
    }

    // Build target criteria
    let contactWhere: any = {
      companyId: campaign.companyId,
      email: { not: null, notIn: [""] },
    };

    if (campaign.targetFormId) {
      contactWhere.sourceFormId = campaign.targetFormId;
    } else if (campaign.projectId) {
      contactWhere.projectId = campaign.projectId;
    }

    // Fetch matching contacts for this scope
    const contacts = await prisma.contact.findMany({
      where: contactWhere,
      select: { id: true }
    });

    if (contacts.length === 0) {
      return NextResponse.json({ error: "No contacts with valid email addresses found." }, { status: 400 });
    }

    // Build the EmailLog entries: uno por mensaje de la secuencia por contacto.
    // base = inicio programado (si es futuro) o ahora; cada mensaje N sale
    // base + suma acumulada de delayDays hasta N.
    const now = new Date();
    const hasFutureStart = campaign.scheduledAt && campaign.scheduledAt.getTime() > now.getTime();
    const base = hasFutureStart ? campaign.scheduledAt! : now;
    const DAY_MS = 24 * 60 * 60 * 1000;

    const logsData: { campaignId: string; contactId: string; stepId: string | null; scheduledAt: Date | null; status: "PENDING" }[] = [];
    for (const contact of contacts) {
      if (campaign.steps.length === 0 && !hasFutureStart) {
        // Comportamiento original: un solo log sin fecha programada
        logsData.push({ campaignId, contactId: contact.id, stepId: null, scheduledAt: null, status: "PENDING" });
        continue;
      }
      // Mensaje 1: subject/body de la campaña
      logsData.push({ campaignId, contactId: contact.id, stepId: null, scheduledAt: base, status: "PENDING" });
      // Mensajes de seguimiento
      let cumulativeDays = 0;
      for (const step of campaign.steps) {
        cumulativeDays += step.delayDays;
        logsData.push({
          campaignId,
          contactId: contact.id,
          stepId: step.id,
          scheduledAt: new Date(base.getTime() + cumulativeDays * DAY_MS),
          status: "PENDING",
        });
      }
    }

    // Perform the operation atomically:
    // 1. Mark campaign as SENDING
    // 2. Insert PENDING logs
    await prisma.$transaction([
      prisma.emailCampaign.update({
        where: { id: campaignId },
        data: { status: "SENDING", sentAt: new Date() },
      }),
      prisma.emailLog.createMany({
        data: logsData,
        skipDuplicates: true
      })
    ]);

    const dispatch = hasFutureStart
      ? { processed: 0, successful: 0, failed: 0, pending: logsData.length }
      : await processCampaignEmails({ organizationId: currentOrganizationId, campaignId, take: 50 });

    const pending = await prisma.emailLog.count({
      where: { campaignId, status: "PENDING" },
    });

    return NextResponse.json({
      message: "Campaign scheduled successfully.",
      totalScheduled: contacts.length,
      totalMessages: logsData.length,
      successful: dispatch.successful,
      failed: dispatch.failed,
      pending,
    }, { status: 200 });
  } catch (error: any) {
    console.error("POST /api/campaigns/send error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
