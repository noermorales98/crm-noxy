import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-03-31.basil" });

  let event: Stripe.Event;

  try {
    if (process.env.STRIPE_WEBHOOK_SECRET && sig) {
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (err: any) {
    console.error("Stripe webhook signature error:", err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const checkoutSession = event.data.object as Stripe.Checkout.Session;
    const paymentId = checkoutSession.metadata?.paymentId;
    const quoteId = checkoutSession.metadata?.quoteId;

    if (paymentId) {
      try {
        await prisma.payment.update({
          where: { id: paymentId },
          data: {
            status: "RECIBIDO",
            receivedAt: new Date(),
          },
        });
        console.log(`Payment ${paymentId} marked as RECIBIDO via Stripe webhook`);
      } catch (err) {
        console.error("Error updating payment from webhook:", err);
      }
    }

    if (quoteId) {
      try {
        const quote = await prisma.quote.findUnique({
          where: { id: quoteId },
          include: { senderCompany: true },
        });
        if (quote && quote.status !== "PAGADA") {
          await prisma.quote.update({
            where: { id: quote.id },
            data: {
              status: "PAGADA",
              paidAt: new Date(),
              paymentMethod: "stripe",
              events: {
                create: {
                  type: "PAGO_STRIPE",
                  description: `Pago con Stripe confirmado (sesión ${checkoutSession.id})`,
                  actor: "cliente",
                  organizationId: quote.organizationId,
                },
              },
            },
          });
          console.log(`Quote ${quote.folio} marked as PAGADA via Stripe webhook`);

          const { notifyQuoteEvent, formatMoney } = await import("@/src/lib/quotes");
          await notifyQuoteEvent({
            company: quote.senderCompany,
            toOwner: quote.notifyEmail,
            ownerSubject: `Pago recibido — Cotización ${quote.folio}`,
            ownerBody: `<p>Se recibió el pago con Stripe de la cotización <strong>${quote.folio}</strong>
              por ${formatMoney(quote.total, quote.currency)} (${quote.clientName}).</p>`,
            toClient: quote.clientEmail,
            clientSubject: `Confirmación de pago — ${quote.folio}`,
            clientBody: `<p>Hola ${quote.clientName},</p>
              <p>Confirmamos tu pago por <strong>${formatMoney(quote.total, quote.currency)}</strong>
              correspondiente a la cotización <strong>${quote.folio}</strong>. ¡Gracias!</p>`,
          });
        }
      } catch (err) {
        console.error("Error updating quote from webhook:", err);
      }
    }
  }

  return NextResponse.json({ received: true });
}
