import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !session.currentOrganizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const { status } = await req.json();
  await prisma.appointment.updateMany({
    where: { id, organizationId: session.currentOrganizationId },
    data: { status }
  });
  return NextResponse.json({ success: true });
}
