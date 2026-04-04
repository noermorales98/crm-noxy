import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;
    const { id: dealId } = await params;

    const deal = await prisma.deal.findFirst({ where: { id: dealId, organizationId } });
    if (!deal) return NextResponse.json({ error: "Deal no encontrado" }, { status: 404 });

    const body = await req.json();
    const { amount, type, status, method, notes, dueDate, receivedAt } = body;

    if (!amount || !type) {
      return NextResponse.json({ error: "amount y type son requeridos" }, { status: 400 });
    }

    const payment = await prisma.payment.create({
      data: {
        amount: parseFloat(amount),
        type,
        status: status || "PENDIENTE",
        method: method || null,
        notes: notes || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        receivedAt: receivedAt ? new Date(receivedAt) : null,
        dealId,
        organizationId,
      },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("POST /api/deals/[id]/payments error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;
    const { id: dealId } = await params;

    const body = await req.json();
    const { paymentId, status } = body;

    if (!paymentId || !status) {
      return NextResponse.json({ error: "paymentId y status son requeridos" }, { status: 400 });
    }

    const payment = await prisma.payment.findFirst({ where: { id: paymentId, dealId, organizationId } });
    if (!payment) return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });

    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status,
        receivedAt: status === "RECIBIDO" ? new Date() : payment.receivedAt,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/deals/[id]/payments error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
