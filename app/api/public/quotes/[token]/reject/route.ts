import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { notifyQuoteEvent } from "@/src/lib/quotes";

/** El cliente rechaza la cotización desde la vista pública. */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const quote = await prisma.quote.findUnique({
      where: { publicToken: token },
      include: { senderCompany: true },
    });
    if (!quote) return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });

    if (quote.status === "PAGADA" || quote.status === "ACEPTADA") {
      return NextResponse.json({ error: "Esta cotización ya fue aceptada y no puede rechazarse" }, { status: 409 });
    }
    if (quote.status === "RECHAZADA") {
      return NextResponse.json({ ok: true, status: "RECHAZADA" });
    }

    const body = await req.json().catch(() => ({}));
    const reason = body.reason ? String(body.reason).slice(0, 500) : null;

    await prisma.quote.update({
      where: { id: quote.id },
      data: {
        status: "RECHAZADA",
        events: {
          create: {
            type: "RECHAZADA",
            description: reason ? `El cliente rechazó la cotización: ${reason}` : "El cliente rechazó la cotización",
            actor: "cliente",
            organizationId: quote.organizationId,
          },
        },
      },
    });

    await notifyQuoteEvent({
      company: quote.senderCompany,
      toOwner: quote.notifyEmail,
      ownerSubject: `Cotización rechazada — ${quote.folio}`,
      ownerBody: `<p><strong>${quote.clientName}</strong> rechazó la cotización <strong>${quote.folio}</strong>.</p>
        ${reason ? `<p>Motivo: ${reason}</p>` : ""}`,
    });

    return NextResponse.json({ ok: true, status: "RECHAZADA" });
  } catch (error) {
    console.error("POST /api/public/quotes/[token]/reject error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
