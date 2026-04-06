import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;
    if (!organizationId) return NextResponse.json({ error: "Sin organización" }, { status: 400 });

    const existing = await prisma.client.findFirst({ where: { id, organizationId } });
    if (!existing) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

    const body = await req.json();
    const fields = [
      "name", "monthlyFee", "currency", "startDate", "billingDay", "notes",
      "isActive", "companyId", "contactId", "autoMarkPaid",
      "contactName", "phone", "phoneCode", "email",
    ] as const;

    const updateData: Record<string, any> = {};
    for (const f of fields) {
      if (body[f] === undefined) continue;
      if (f === "monthlyFee") updateData[f] = parseFloat(body[f]);
      else if (f === "billingDay") updateData[f] = parseInt(body[f]);
      else if (f === "startDate") updateData[f] = new Date(body[f]);
      else updateData[f] = body[f] ?? null;
    }

    const client = await prisma.client.update({
      where: { id },
      data: updateData,
      include: {
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        payments: { orderBy: [{ year: "desc" }, { month: "desc" }], take: 13 },
      },
    });

    return NextResponse.json(client);
  } catch (error) {
    console.error("PATCH /api/clients/[id] error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;
    if (!organizationId) return NextResponse.json({ error: "Sin organización" }, { status: 400 });

    const existing = await prisma.client.findFirst({ where: { id, organizationId } });
    if (!existing) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

    await prisma.client.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/clients/[id] error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
