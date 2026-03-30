import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !session.currentOrganizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const schedule = await prisma.availabilitySchedule.findFirst({
    where: { id, organizationId: session.currentOrganizationId },
    include: { slots: { orderBy: { dayOfWeek: "asc" } } }
  });
  if (!schedule) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(schedule);
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user || !session.currentOrganizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    const { name, timezone, slots } = await req.json();

    const schedule = await prisma.$transaction(async (tx) => {
      await tx.availabilitySlot.deleteMany({ where: { scheduleId: id } });
      return tx.availabilitySchedule.update({
        where: { id },
        data: {
          name,
          timezone,
          slots: {
            create: (slots || []).map((s: any) => ({
              dayOfWeek: s.dayOfWeek,
              startTime: s.startTime,
              endTime: s.endTime,
              isAvailable: s.isAvailable ?? true
            }))
          }
        },
        include: { slots: true }
      });
    });
    return NextResponse.json(schedule);
  } catch (error: any) {
    console.error("PUT /api/availability/[id] error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !session.currentOrganizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  await prisma.availabilitySchedule.deleteMany({
    where: { id, organizationId: session.currentOrganizationId }
  });
  return NextResponse.json({ success: true });
}
