import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";
import Stripe from "stripe";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;
    const { id: dealId } = await params;

    const deal = await prisma.deal.findFirst({ where: { id: dealId, organizationId } });
    if (!deal) return NextResponse.json({ error: "Deal no encontrado" }, { status: 404 });

    const body = await req.json();
    const { paymentId, amount, description } = body;

    if (!paymentId || !amount || !description) {
      return NextResponse.json({ error: "paymentId, amount y description son requeridos" }, { status: 400 });
    }

    const payment = await prisma.payment.findFirst({ where: { id: paymentId, dealId, organizationId } });
    if (!payment) return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });

    // Return existing link if already created
    if (payment.stripePaymentLinkUrl) {
      return NextResponse.json({ url: payment.stripePaymentLinkUrl });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Stripe no configurado" }, { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-03-31.basil" });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://localhost:3000";
    const amountInCents = Math.round(parseFloat(amount) * 100);

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: amountInCents,
            product_data: { name: description },
          },
          quantity: 1,
        },
      ],
      after_completion: {
        type: "redirect",
        redirect: { url: `${baseUrl}/pipeline/${dealId}` },
      },
      metadata: { dealId, paymentId, organizationId },
    });

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        stripePaymentLinkId: paymentLink.id,
        stripePaymentLinkUrl: paymentLink.url,
      },
    });

    return NextResponse.json({ url: paymentLink.url });
  } catch (error) {
    console.error("POST /api/deals/[id]/stripe error:", error);
    return NextResponse.json({ error: "Error generando link de Stripe" }, { status: 500 });
  }
}
