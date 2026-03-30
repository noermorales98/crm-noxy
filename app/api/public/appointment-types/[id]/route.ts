import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";

function corsHeaders() {
  return { "Access-Control-Allow-Origin": "*" };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS" }
  });
}

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  // Try to find by slug first, then by ID
  const appointmentType = await prisma.appointmentType.findFirst({
    where: {
      OR: [{ slug: id }, { id }],
      isActive: true
    },
    include: {
      schedule: { include: { slots: true } }
    }
  });

  if (!appointmentType) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: corsHeaders() });
  }

  // Return without sensitive org data
  const { organizationId, ...safe } = appointmentType as any;
  return NextResponse.json(safe, { headers: corsHeaders() });
}
