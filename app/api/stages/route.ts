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
    const { name, pipelineId, order } = body;

    if (!name || (!pipelineId && pipelineId !== "")) {
      return NextResponse.json({ error: "Name and pipelineId are required" }, { status: 400 });
    }

    // Verify pipeline belongs to the user's active organization
    const pipeline = await prisma.pipeline.findUnique({
      where: { id: pipelineId }
    });

    if (!pipeline || pipeline.organizationId !== currentOrganizationId) {
      return NextResponse.json({ error: "Invalid pipeline" }, { status: 400 });
    }

    const stage = await prisma.stage.create({
      data: {
        name,
        order: parseInt(order) || 99,
        pipelineId
      }
    });

    return NextResponse.json(stage, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/stages error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
