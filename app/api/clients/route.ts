import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;
    if (!organizationId) return NextResponse.json({ error: "Sin organización" }, { status: 400 });

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const clients = await prisma.client.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        payments: { orderBy: [{ year: "desc" }, { month: "desc" }], take: 13 },
      },
    });

    // Auto-mark paid: create RECIBIDO payment for current month if autoMarkPaid=true and no payment yet
    for (const client of clients) {
      if (!client.isActive || !client.autoMarkPaid) continue;
      const hasThisMonth = client.payments.some(
        (p) => p.month === currentMonth && p.year === currentYear
      );
      if (!hasThisMonth) {
        const newPayment = await prisma.clientPayment.create({
          data: {
            clientId: client.id,
            organizationId,
            month: currentMonth,
            year: currentYear,
            amount: client.monthlyFee,
            currency: client.currency,
            status: "RECIBIDO",
            receivedAt: new Date(),
          },
        });
        client.payments.unshift(newPayment as any);
      }
    }

    return NextResponse.json(clients);
  } catch (error) {
    console.error("GET /api/clients error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;
    if (!organizationId) return NextResponse.json({ error: "Sin organización" }, { status: 400 });

    const body = await req.json();
    const {
      name, monthlyFee, currency, startDate, billingDay, notes, companyId, contactId,
      autoMarkPaid, contactName, phone, phoneCode, email,
    } = body;

    if (!name || !monthlyFee || !startDate)
      return NextResponse.json({ error: "Nombre, cuota y fecha de inicio son requeridos" }, { status: 400 });

    const client = await prisma.client.create({
      data: {
        name: name.trim(),
        monthlyFee: parseFloat(monthlyFee),
        currency: currency || "USD",
        startDate: new Date(startDate),
        billingDay: billingDay ? parseInt(billingDay) : 1,
        notes: notes || null,
        autoMarkPaid: autoMarkPaid || false,
        contactName: contactName || null,
        phone: phone || null,
        phoneCode: phoneCode || "+52",
        email: email || null,
        organizationId,
        companyId: companyId || null,
        contactId: contactId || null,
      },
      include: {
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        payments: true,
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error("POST /api/clients error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
