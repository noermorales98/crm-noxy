import { ACTIVE_DEALS } from "@/src/lib/deal-filters";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";
import { NEW_CATEGORY_STAGES, parseCategoryName } from "@/src/lib/pipeline-categories";

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

    const { searchParams } = new URL(req.url);
    const slim = searchParams.get("slim") === "true";

    const pipelines = await prisma.pipeline.findMany({
      where: { organizationId: currentOrganizationId },
      orderBy: { createdAt: "asc" },
      include: {
        stages: {
          orderBy: { order: "asc" },
          ...(slim
            ? { select: { id: true, name: true, order: true } }
            : {
                include: {
                  deals: {
                    where: ACTIVE_DEALS,
                    orderBy: { createdAt: "desc" },
                    include: {
                      company: { select: { name: true } },
                      contact: { select: { firstName: true, lastName: true } },
                    },
                  },
                },
              }),
        },
      },
    });

    return NextResponse.json(pipelines);
  } catch (error: any) {
    console.error("GET /api/pipelines error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/** Crea una categoría nueva (un pipeline con sus etapas) en la organización actual. */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;
    if (!organizationId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

    const existing = await prisma.pipeline.findMany({ where: { organizationId }, select: { name: true } });
    const parsed = parseCategoryName(await req.json().catch(() => null), existing.map((p) => p.name));
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const pipeline = await prisma.pipeline.create({
      data: {
        name: parsed.name,
        organizationId,
        stages: { create: NEW_CATEGORY_STAGES.map((stage, order) => ({ ...stage, order })) },
      },
      select: { id: true, name: true },
    });
    return NextResponse.json(pipeline, { status: 201 });
  } catch (error) {
    console.error("POST /api/pipelines error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
