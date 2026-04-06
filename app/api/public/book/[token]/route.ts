import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

// GET — resolve deal booking token → org appointment types + deal info
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const deal = await prisma.deal.findUnique({
      where: { bookingToken: token },
      select: {
        id: true,
        title: true,
        organizationId: true,
        allowedBookingTypes: true,
        contact: { select: { firstName: true, lastName: true, email: true, phone: true } },
      },
    });

    if (!deal) {
      return NextResponse.json({ error: "Link inválido" }, { status: 404, headers: corsHeaders() });
    }

    const { searchParams } = new URL(_req.url);

    const whereClause: any = { organizationId: deal.organizationId, isActive: true };
    if (deal.allowedBookingTypes) {
      whereClause.id = { in: deal.allowedBookingTypes.split(",") };
    }

    // Get active appointment types for this organization
    const appointmentTypes = await prisma.appointmentType.findMany({
      where: whereClause,
      include: { schedule: { include: { slots: true } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      deal: {
        id: deal.id,
        title: deal.title,
        contact: deal.contact,
      },
      appointmentTypes: appointmentTypes.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        duration: t.duration,
        color: t.color,
        location: t.location,
        maxAdvanceDays: t.maxAdvanceDays,
        schedule: t.schedule,
      })),
    }, { headers: corsHeaders() });
  } catch (error) {
    console.error("GET /api/public/book/[token] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500, headers: corsHeaders() });
  }
}
