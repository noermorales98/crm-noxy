import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, Accept-Language",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=120, s-maxage=300, stale-while-revalidate=600",
    "Vary": "Accept-Encoding",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept, Accept-Language",
      "Access-Control-Max-Age": "86400",
    }
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
