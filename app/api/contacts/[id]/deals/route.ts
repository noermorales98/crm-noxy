import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { pickLeadStage } from "@/src/lib/form-lead";

async function context(params: Promise<{ id: string }>) {
  const session = await auth();
  const organizationId = (session as any)?.currentOrganizationId as string | undefined;
  if (!session?.user || !organizationId) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  const { id } = await params;
  const contact = await prisma.contact.findFirst({ where: { id, organizationId }, select: { id: true, firstName: true, lastName: true, companyId: true } });
  if (!contact) return { error: NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 }) } as const;
  return { organizationId, contact } as const;
}

// Leads que se pueden enlazar a este contacto: todos los de la organización que aún no son suyos.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await context(params);
    if ("error" in ctx) return ctx.error;
    const deals = await prisma.deal.findMany({
      where: { organizationId: ctx.organizationId, isArchived: false, OR: [{ contactId: null }, { contactId: { not: ctx.contact.id } }] },
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: {
        id: true,
        title: true,
        value: true,
        currency: true,
        stage: { select: { name: true, isWon: true, isLost: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return NextResponse.json(deals);
  } catch (error) {
    console.error("GET /api/contacts/[id]/deals error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// { dealId } enlaza un lead existente; { title } crea uno nuevo en la etapa «Lead» ya ligado al contacto.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await context(params);
    if ("error" in ctx) return ctx.error;
    const body = await req.json();

    if (body.dealId) {
      const deal = await prisma.deal.findFirst({ where: { id: String(body.dealId), organizationId: ctx.organizationId }, select: { id: true } });
      if (!deal) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
      const updated = await prisma.deal.update({ where: { id: deal.id }, data: { contactId: ctx.contact.id }, select: { id: true, title: true, contactId: true } });
      return NextResponse.json(updated);
    }

    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return NextResponse.json({ error: "Indica un título o elige un lead existente" }, { status: 400 });
    const value = body.value === undefined || body.value === "" || body.value === null ? 0 : Number(body.value);
    if (!Number.isFinite(value) || value < 0) return NextResponse.json({ error: "Valor no válido" }, { status: 400 });

    const pipelines = await prisma.pipeline.findMany({
      where: { organizationId: ctx.organizationId },
      select: { id: true, createdAt: true, stages: { select: { id: true, name: true, order: true, isWon: true, isLost: true } } },
    });
    const target = pickLeadStage(pipelines);
    if (!target) return NextResponse.json({ error: "No hay etapas de pipeline configuradas" }, { status: 400 });

    const created = await prisma.deal.create({
      data: {
        title: title.slice(0, 190),
        value,
        currency: typeof body.currency === "string" && body.currency ? body.currency : "MXN",
        organizationId: ctx.organizationId,
        pipelineId: target.pipelineId,
        stageId: target.stageId,
        contactId: ctx.contact.id,
        companyId: ctx.contact.companyId,
      },
      select: { id: true, title: true, contactId: true },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/contacts/[id]/deals error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
