import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const currentOrganizationId = (session as any).currentOrganizationId;

    const body = await req.json();
    const { title, value, stageId, companyId, contactId } = body;

    if (!title || !stageId) {
      return NextResponse.json({ error: "Title and Stage are required" }, { status: 400 });
    }

    // Verify stage belongs to a pipeline in this organization
    const stage = await prisma.stage.findUnique({
      where: { id: stageId },
      include: { pipeline: true }
    });

    if (!stage || stage.pipeline.organizationId !== currentOrganizationId) {
      return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
    }

    const deal = await prisma.deal.create({
      data: {
        title,
        value: value ? parseFloat(value) : 0,
        stageId,
        companyId,
        contactId,
        organizationId: currentOrganizationId,
      },
      include: {
        company: { select: { name: true } },
        contact: { select: { firstName: true, lastName: true } }
      }
    });

    return NextResponse.json(deal, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/deals error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const currentOrganizationId = (session as any).currentOrganizationId;

    const body = await req.json();
    const { id, stageId } = body;

    if (!id || !stageId) {
      return NextResponse.json({ error: "Deal ID and new Stage ID are required" }, { status: 400 });
    }

    const existingDeal = await prisma.deal.findUnique({
      where: { id }
    });
    
    if (!existingDeal || existingDeal.organizationId !== currentOrganizationId) {
      return NextResponse.json({ error: "Deal not found or unauthorized" }, { status: 404 });
    }

    const newStage = await prisma.stage.findUnique({
      where: { id: stageId },
      include: { pipeline: true }
    });

    if (!newStage || newStage.pipeline.organizationId !== currentOrganizationId) {
       return NextResponse.json({ error: "Invalid destination stage" }, { status: 400 });
    }

    const updatedDeal = await prisma.deal.update({
      where: { id },
      data: { stageId },
      include: {
        company: { select: { name: true } },
        contact: { select: { firstName: true, lastName: true } }
      }
    });

    return NextResponse.json(updatedDeal);
  } catch (error: any) {
    console.error("PATCH /api/deals error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
