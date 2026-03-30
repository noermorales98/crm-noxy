import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user || !session.currentOrganizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const schedules = await prisma.availabilitySchedule.findMany({
    where: { organizationId: session.currentOrganizationId },
    include: { slots: { orderBy: { dayOfWeek: "asc" } } },
    orderBy: { createdAt: "asc" }
  });
  return NextResponse.json(schedules);
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !session.currentOrganizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { name, timezone, slots } = await req.json();
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (!timezone) return NextResponse.json({ error: "Timezone is required" }, { status: 400 });

    const schedule = await prisma.availabilitySchedule.create({
      data: {
        name,
        timezone,
        organizationId: session.currentOrganizationId,
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
    return NextResponse.json(schedule, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/availability error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
