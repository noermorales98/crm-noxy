import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const organizationId = (session as any).currentOrganizationId;
    if (!organizationId) return NextResponse.json({ error: "Context required" }, { status: 400 });

    const extended = await prisma.extendedAvailability.findMany({
      where: { organizationId },
      orderBy: { date: "asc" },
    });

    return NextResponse.json(extended);
  } catch (error: any) {
    console.error("GET ExtendedAvailability Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const organizationId = (session as any).currentOrganizationId;
    if (!organizationId) return NextResponse.json({ error: "Context required" }, { status: 400 });

    const { title, date, startTime, endTime } = await req.json();

    if (!date || !startTime || !endTime) {
      return NextResponse.json({ error: "date, startTime y endTime son requeridos" }, { status: 400 });
    }

    if (startTime >= endTime) {
      return NextResponse.json({ error: "La hora de fin debe ser después de la hora de inicio" }, { status: 400 });
    }

    const extended = await prisma.extendedAvailability.create({
      data: {
        title: title || "Horario extendido",
        date: new Date(date),
        startTime,
        endTime,
        organizationId,
      },
    });

    return NextResponse.json(extended, { status: 201 });
  } catch (error: any) {
    console.error("POST ExtendedAvailability Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
