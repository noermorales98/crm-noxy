import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || !session.currentOrganizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const appointments = await prisma.appointment.findMany({
    where: {
      organizationId: session.currentOrganizationId,
      ...(status ? { status } : {})
    },
    include: {
      appointmentType: { select: { name: true, duration: true, color: true } },
      contact: { select: { firstName: true, lastName: true, email: true } }
    },
    orderBy: { startTime: "asc" }
  });
  return NextResponse.json(appointments);
}
