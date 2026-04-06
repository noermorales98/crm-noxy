import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;
    if (!organizationId) return NextResponse.json({ error: "Sin organización" }, { status: 400 });

    const payments = await prisma.clientPayment.findMany({
      where: { clientId: id, organizationId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("GET /api/clients/[id]/payments error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;
    if (!organizationId) return NextResponse.json({ error: "Sin organización" }, { status: 400 });

    const client = await prisma.client.findFirst({ where: { id, organizationId } });
    if (!client) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

    const body = await req.json();
    const { month, year, amount, currency, notes, dueDate } = body;

    if (!month || !year) {
      return NextResponse.json({ error: "Mes y año son requeridos" }, { status: 400 });
    }

    const payment = await prisma.clientPayment.create({
      data: {
        clientId: id,
        organizationId,
        month: parseInt(month),
        year: parseInt(year),
        amount: amount ? parseFloat(amount) : client.monthlyFee,
        currency: currency || client.currency,
        notes: notes || null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("POST /api/clients/[id]/payments error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await params; // consume
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;
    if (!organizationId) return NextResponse.json({ error: "Sin organización" }, { status: 400 });

    const body = await req.json();
    const { paymentId, status, notes } = body;

    if (!paymentId) return NextResponse.json({ error: "paymentId es requerido" }, { status: 400 });

    const existing = await prisma.clientPayment.findFirst({
      where: { id: paymentId, organizationId },
    });
    if (!existing) return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });

    const updateData: Record<string, any> = {};
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (status === "RECIBIDO") updateData.receivedAt = new Date();

    const payment = await prisma.clientPayment.update({
      where: { id: paymentId },
      data: updateData,
    });

    return NextResponse.json(payment);
  } catch (error) {
    console.error("PATCH /api/clients/[id]/payments error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
