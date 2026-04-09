import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user || !session.currentOrganizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const types = await prisma.appointmentType.findMany({
    where: { organizationId: session.currentOrganizationId },
    include: {
      schedule: true,
      company: { select: { id: true, name: true } },
      _count: {
        select: {
          appointments: true,
          forms: true
        }
      }
    },
    orderBy: { createdAt: "asc" }
  });
  return NextResponse.json(types);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !session.currentOrganizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { name, description, duration, color, location, slug, scheduleId, bufferAfter, maxAdvanceDays, companyId } = await req.json();
  if (!name || !duration || !slug || !scheduleId) {
    return NextResponse.json({ error: "name, duration, slug, and scheduleId are required" }, { status: 400 });
  }

  try {
    const type = await prisma.appointmentType.create({
      data: {
        name,
        description,
        duration: Number(duration),
        color: color || "#3B82F6",
        location,
        slug,
        scheduleId,
        companyId: companyId || null,
        organizationId: session.currentOrganizationId,
        bufferAfter: Number(bufferAfter) || 0,
        maxAdvanceDays: Number(maxAdvanceDays) || 30
      },
      include: { schedule: true, company: { select: { id: true, name: true } } }
    });
    return NextResponse.json(type, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
    throw e;
  }
}
