import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";
import { sendWhatsAppNotification } from "@/src/lib/whatsapp";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;
    if (!organizationId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

    const pipelines = await prisma.pipeline.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
      include: {
        stages: {
          orderBy: { order: "asc" },
          include: {
            deals: {
              orderBy: { createdAt: "desc" },
              include: {
                contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
                company: { select: { id: true, name: true } },
                _count: { select: { activities: true } },
                activities: {
                  orderBy: { createdAt: "desc" },
                  take: 1,
                  select: { createdAt: true, type: true },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json(pipelines);
  } catch (error) {
    console.error("GET /api/deals error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;
    if (!organizationId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

    const body = await req.json();
    const { title, stageId, value, contactId, companyId, source, followUpAt, probability, notes } = body;

    if (!title || !stageId) {
      return NextResponse.json({ error: "title y stageId son requeridos" }, { status: 400 });
    }

    const stage = await prisma.stage.findFirst({
      where: { id: stageId, pipeline: { organizationId } },
      include: { pipeline: true },
    });
    if (!stage) return NextResponse.json({ error: "Stage no encontrado o no autorizado" }, { status: 404 });

    const deal = await prisma.deal.create({
      data: {
        title,
        value: value ? parseFloat(value) : 0,
        stageId,
        pipelineId: stage.pipelineId,
        organizationId,
        contactId: contactId || null,
        companyId: companyId || null,
        source: source || null,
        followUpAt: followUpAt ? new Date(followUpAt) : null,
        probability: probability ?? 50,
        notes: notes || null,
      },
      include: {
        stage: true,
        contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        company: { select: { id: true, name: true } },
        _count: { select: { activities: true } },
      },
    });

    return NextResponse.json(deal, { status: 201 });
  } catch (error) {
    console.error("POST /api/deals error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;
    if (!organizationId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

    const body = await req.json();
    const { id, stageId, followUpAt, lostReason, source, value, probability, notes, title, currency, contactId } = body;

    if (!id) return NextResponse.json({ error: "Deal id es requerido" }, { status: 400 });

    const existing = await prisma.deal.findFirst({ where: { id, organizationId } });
    if (!existing) return NextResponse.json({ error: "Deal no encontrado" }, { status: 404 });

    const updateData: Record<string, any> = {};
    if (title !== undefined) updateData.title = title;
    if (value !== undefined) updateData.value = parseFloat(value);
    if (currency !== undefined) updateData.currency = currency;
    if (source !== undefined) updateData.source = source || null;
    if (probability !== undefined) updateData.probability = probability;
    if (notes !== undefined) updateData.notes = notes;
    if (lostReason !== undefined) updateData.lostReason = lostReason;
    if (followUpAt !== undefined) updateData.followUpAt = followUpAt ? new Date(followUpAt) : null;
    if (contactId !== undefined) updateData.contactId = contactId || null;
    if (body.allowedBookingTypes !== undefined) updateData.allowedBookingTypes = body.allowedBookingTypes || null;

    if (stageId !== undefined && stageId !== existing.stageId) {
      const stage = await prisma.stage.findFirst({
        where: { id: stageId, pipeline: { organizationId } },
      });
      if (!stage) return NextResponse.json({ error: "Stage no válido" }, { status: 404 });
      updateData.stageId = stageId;
      updateData.pipelineId = stage.pipelineId;

      // WhatsApp notification when deal moves to a won stage
      if (stage.isWon && session.user?.id) {
        prisma.callMeBot.findUnique({ where: { userId: session.user.id } }).then((config) => {
          if (config?.phone && config?.apiKey) {
            sendWhatsAppNotification(
              config.phone,
              config.apiKey,
              `🎉 ¡Deal ganado!\n📌 ${existing.title}\n💰 $${existing.value ?? 0} ${existing.currency}\n¡Excelente trabajo!`
            );
          }
        });
      }
    }

    const deal = await prisma.deal.update({
      where: { id },
      data: updateData,
      include: {
        stage: true,
        contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        company: { select: { id: true, name: true } },
        _count: { select: { activities: true } },
      },
    });

    return NextResponse.json(deal);
  } catch (error) {
    console.error("PATCH /api/deals error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
