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
  }

  return NextResponse.json({ received: true });
}
