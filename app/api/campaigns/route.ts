import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOrganizationId = (session as any).currentOrganizationId;
    if (!currentOrganizationId) {
      return NextResponse.json({ error: "No organization context" }, { status: 400 });
    }

    const campaigns = await prisma.emailCampaign.findMany({
      where: {
        organizationId: currentOrganizationId,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        company: {
          select: { name: true }
        },
        project: {
          select: { name: true }
        },
        targetForm: {
          select: { name: true }
        },
        steps: {
          select: { order: true, delayDays: true, subject: true },
          orderBy: { order: "asc" }
        },
        _count: {
          select: { logs: true }
        }
      }
    });

    // Próximo envío programado por campaña (menor scheduledAt futuro entre PENDING)
    const campaignIds = campaigns.map((c) => c.id);
    const [nextByCampaign, logCounts] = campaignIds.length === 0
      ? [[], []] as const
      : await Promise.all([
          prisma.emailLog.groupBy({
            by: ["campaignId"],
            where: { campaignId: { in: campaignIds }, status: "PENDING", scheduledAt: { gt: new Date() } },
            _min: { scheduledAt: true },
          }),
          prisma.emailLog.groupBy({
            by: ["campaignId", "status"],
            where: { campaignId: { in: campaignIds } },
            _count: { _all: true },
          }),
        ]);

    const nextMap = new Map(
      nextByCampaign.map((row) => [row.campaignId, row._min.scheduledAt])
    );
    const logsByCampaign = new Map<string, Record<string, number>>();
    for (const row of logCounts) {
      const current = logsByCampaign.get(row.campaignId) ?? {};
      current[row.status] = row._count._all;
      logsByCampaign.set(row.campaignId, current);
    }

    return NextResponse.json(
      campaigns.map((campaign) => ({
        ...campaign,
        nextScheduledAt: nextMap.get(campaign.id) ?? null,
        logsByStatus: logsByCampaign.get(campaign.id) ?? {},
      }))
    );
  } catch (error: any) {
    console.error("GET /api/campaigns error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

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
    const { subject, body: htmlBody, companyId, projectId, targetFormId, scheduledAt, steps } = body;

    if (!subject || !htmlBody || !companyId) {
      return NextResponse.json({ error: "Subject, body, and company are required" }, { status: 400 });
    }

    // Fecha de inicio programada (opcional; debe ser una fecha válida)
    let scheduledDate: Date | null = null;
    if (scheduledAt) {
      scheduledDate = new Date(scheduledAt);
      if (isNaN(scheduledDate.getTime())) {
        return NextResponse.json({ error: "La fecha de inicio programada no es válida" }, { status: 400 });
      }
    }

    // Secuencia de seguimiento (opcional, máx. 10 mensajes adicionales)
    const stepInputs: { delayDays: number; subject: string; body: string }[] = [];
    if (steps != null) {
      if (!Array.isArray(steps) || steps.length > 10) {
        return NextResponse.json({ error: "La secuencia admite un máximo de 10 mensajes de seguimiento" }, { status: 400 });
      }
      for (const [i, step] of steps.entries()) {
        const delay = Number(step?.delayDays);
        if (!Number.isFinite(delay) || delay < 0 || delay > 365) {
          return NextResponse.json({ error: `El mensaje ${i + 2} debe tener un retraso entre 0 y 365 días` }, { status: 400 });
        }
        if (!step?.subject || !String(step.subject).trim() || !step?.body || !String(step.body).trim()) {
          return NextResponse.json({ error: `El mensaje ${i + 2} necesita asunto y cuerpo` }, { status: 400 });
        }
        stepInputs.push({
          delayDays: Math.round(delay),
          subject: String(step.subject).trim(),
          body: String(step.body),
        });
      }
    }

    // Verify company belongs to organization
    const company = await prisma.company.findUnique({
       where: { id: companyId }
    });
    if (!company || company.organizationId !== currentOrganizationId) {
       return NextResponse.json({ error: "Invalid company" }, { status: 400 });
    }

    const campaign = await prisma.emailCampaign.create({
      data: {
        subject,
        body: htmlBody,
        status: "DRAFT",
        scheduledAt: scheduledDate,
        organizationId: currentOrganizationId,
        companyId: companyId,
        projectId: projectId || null,
        targetFormId: targetFormId || null,
        steps: {
          create: stepInputs.map((step, i) => ({
            order: i + 2, // el mensaje 1 es subject/body de la campaña
            delayDays: step.delayDays,
            subject: step.subject,
            body: step.body,
          })),
        },
      },
      include: { steps: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/campaigns error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
