import { effectiveDealValue } from "@/src/lib/deal-sales";
import { NextResponse, after } from "next/server";
import { ensureContactForWonDeal, ensureProjectForWonDeal } from "@/src/lib/deal-won";
import { ensureDeliveryReferrals, ensureLeadFollowups } from "@/src/lib/lead-followup-service";
import { autoSync } from "@/src/lib/notion-sync";
import { refreshSnapshotForDeal } from "@/src/lib/month-close-service";
import { normalizeDealIcon } from "@/src/lib/deal-icons";
import { prisma } from "@/src/lib/db";
import { assertOrgRefs } from "@/src/lib/org-refs";
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
              where: { isArchived: false },
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
                quotes: { select: { status: true, total: true, currency: true } },
              },
            },
          },
        },
      },
    });

    // El tablero muestra el valor efectivo: el fijado a mano o, si no hay, el de sus cotizaciones.
    const withEffectiveValue = pipelines.map((pipeline) => ({
      ...pipeline,
      stages: pipeline.stages.map((stage) => ({
        ...stage,
        deals: stage.deals.map(({ quotes, ...deal }) => {
          const effective = effectiveDealValue({ value: deal.value, currency: deal.currency, quotes });
          return { ...deal, value: effective.amount, currency: effective.currency, valueSource: effective.source };
        }),
      })),
    }));

    return NextResponse.json(withEffectiveValue);
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

    const refError = await assertOrgRefs(prisma as never, organizationId, { contactId, companyId });
    if (refError) return NextResponse.json({ error: refError }, { status: 400 });

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

    await ensureLeadFollowups(deal.id, organizationId);
    after(() => autoSync(organizationId, "deal", deal.id));
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
    const icon = body.icon === undefined ? undefined : normalizeDealIcon(body.icon);
    if (body.icon !== undefined && body.icon !== null && body.icon !== "" && icon === null) {
      return NextResponse.json({ error: "Icono no válido" }, { status: 400 });
    }

    if (!id) return NextResponse.json({ error: "Deal id es requerido" }, { status: 400 });

    const existing = await prisma.deal.findFirst({ where: { id, organizationId } });
    if (!existing) return NextResponse.json({ error: "Deal no encontrado" }, { status: 404 });

    const refError = await assertOrgRefs(prisma as never, organizationId, { contactId });
    if (refError) return NextResponse.json({ error: refError }, { status: 400 });

    const updateData: Record<string, any> = {};
    let lostNote: string | null = null;
    if (title !== undefined) updateData.title = title;
    if (value !== undefined) updateData.value = parseFloat(value);
    if (currency !== undefined) updateData.currency = currency;
    if (source !== undefined) updateData.source = source || null;
    if (probability !== undefined) updateData.probability = probability;
    if (notes !== undefined) updateData.notes = notes;
    if (lostReason !== undefined) updateData.lostReason = lostReason;
    if (followUpAt !== undefined) {
      updateData.followUpAt = followUpAt ? new Date(followUpAt) : null;
      updateData.followUpNotifiedAt = null; // fecha nueva: puede volver a avisar
    }
    if (contactId !== undefined) updateData.contactId = contactId || null;
    // «Referido por»: un cliente o un contacto de la misma organización (o null para quitarlo)
    if (body.referredByClientId !== undefined) {
      if (body.referredByClientId) {
        const ok = await prisma.client.findFirst({ where: { id: body.referredByClientId, organizationId }, select: { id: true } });
        if (!ok) return NextResponse.json({ error: "Cliente referidor no válido" }, { status: 404 });
      }
      updateData.referredByClientId = body.referredByClientId || null;
    }
    if (body.referredByContactId !== undefined) {
      if (body.referredByContactId) {
        const ok = await prisma.contact.findFirst({ where: { id: body.referredByContactId, organizationId }, select: { id: true } });
        if (!ok) return NextResponse.json({ error: "Contacto referidor no válido" }, { status: 404 });
      }
      updateData.referredByContactId = body.referredByContactId || null;
    }
    if (icon !== undefined) updateData.icon = icon;
    if (body.allowedBookingTypes !== undefined) updateData.allowedBookingTypes = body.allowedBookingTypes || null;
    if (body.isArchived !== undefined) {
      updateData.isArchived = body.isArchived;
      updateData.archivedAt = body.isArchived ? new Date() : null;
    }

    if (stageId !== undefined && stageId !== existing.stageId) {
      const stage = await prisma.stage.findFirst({
        where: { id: stageId, pipeline: { organizationId } },
      });
      if (!stage) return NextResponse.json({ error: "Stage no válido" }, { status: 404 });
      // Perder un deal exige decir por qué: queda en lostReason, en lostAt (para el cierre del mes) y en la bitácora.
      if (stage.isLost) {
        const reason = typeof lostReason === "string" ? lostReason.trim() : "";
        const finalReason = reason || existing.lostReason?.trim() || "";
        if (!finalReason) return NextResponse.json({ error: "Indica por qué se perdió el deal" }, { status: 400 });
        updateData.lostReason = finalReason;
        updateData.lostAt = new Date();
        lostNote = finalReason;
      } else {
        updateData.lostAt = null; // dejó de estar perdido (el motivo se conserva por si se pierde otra vez)
      }
      updateData.stageId = stageId;
      updateData.pipelineId = stage.pipelineId;
      // Fecha de cierre: al entrar a una etapa ganada (si ya era ganado se conserva); al salir de ganado se borra.
      if (stage.isWon) {
        if (!existing.wonAt) updateData.wonAt = new Date();
      } else {
        updateData.wonAt = null;
      }

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

    if (lostNote) {
      await prisma.activityLog.create({
        data: { type: "NOTA", description: `Deal perdido en «${deal.stage.name}». Motivo: ${lostNote}`, dealId: deal.id, organizationId, createdById: session.user?.id || null },
      });
    }
    after(() => autoSync(organizationId, "deal", deal.id));
    // Corregir valor/moneda de un ganado de un mes ya cerrado actualiza la foto de ese mes
    if (deal.stage.isWon && (value !== undefined || currency !== undefined)) after(() => refreshSnapshotForDeal(organizationId, deal.id));
    // Etapa ganada → contacto (si faltaba) + proyecto + tareas base
    let wonProject = null;
    if (deal.stage.isWon) {
      await ensureContactForWonDeal({ dealId: deal.id, organizationId });
      wonProject = await ensureProjectForWonDeal({ dealId: deal.id, organizationId, actorUserId: session.user?.id });
    }
    if (deal.stage.name.toLowerCase() === "entregado") {
      const project = await prisma.project.findFirst({where:{organizationId,dealId:deal.id},select:{id:true}});
      if(project) await ensureDeliveryReferrals(project.id, organizationId);
    }
    return NextResponse.json({ ...deal, wonProject });
  } catch (error) {
    console.error("PATCH /api/deals error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
