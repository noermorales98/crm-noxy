import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !session.currentOrganizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const type = await prisma.appointmentType.findFirst({
    where: { id, organizationId: session.currentOrganizationId },
    include: { schedule: { include: { slots: true } } }
  });
  if (!type) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(type);
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !session.currentOrganizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const { name, description, duration, color, location, slug, scheduleId, isActive, bufferAfter, maxAdvanceDays } = await req.json();

  try {
    const type = await prisma.appointmentType.updateMany({
      where: { id, organizationId: session.currentOrganizationId },
      data: {
        name,
        description,
        duration: Number(duration),
        color,
        location,
        slug,
        scheduleId,
        isActive,
        bufferAfter: Number(bufferAfter) || 0,
        maxAdvanceDays: Number(maxAdvanceDays) || 30
      }
    });
    return NextResponse.json(type);
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
    throw e;
  }
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !session.currentOrganizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  await prisma.appointmentType.deleteMany({
    where: { id, organizationId: session.currentOrganizationId }
  });
  return NextResponse.json({ success: true });
}
