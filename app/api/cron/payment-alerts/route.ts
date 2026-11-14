import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { sendWhatsAppNotification } from "@/src/lib/whatsapp";
import { dueAlertMessage, daysUntilDue, monthlyDueDate, needsDueAlert } from "@/src/lib/payment-status";

// Avisa por WhatsApp (CallMeBot al dueño) los cobros que vencen en ≤2 días. Una vez por cobro.
export async function GET(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authorized = cronSecret
      ? req.headers.get("authorization") === `Bearer ${cronSecret}`
      : process.env.NODE_ENV !== "production";
    if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const now = new Date();
    const orgs = await prisma.organization.findMany({
      select: {
        id: true,
        timezone: true,
        members: { where: { role: "OWNER" }, take: 1, select: { user: { select: { callMeBot: true } } } },
      },
    });

    let alerted = 0;
    const failed: string[] = [];

    for (const org of orgs) {
      const bot = org.members[0]?.user?.callMeBot;
      if (!bot?.phone || !bot?.apiKey) continue;
      const tz = org.timezone || "America/Cancun";

      const [dealPayments, clientPayments] = await Promise.all([
        prisma.payment.findMany({
          where: { organizationId: org.id, status: "PENDIENTE", dueAlertSentAt: null, dueDate: { not: null } },
          include: { deal: { select: { title: true, contact: { select: { firstName: true, lastName: true } } } } },
        }),
        prisma.clientPayment.findMany({
          where: { organizationId: org.id, status: "PENDIENTE", dueAlertSentAt: null },
          include: { client: { select: { name: true, billingDay: true } } },
        }),
      ]);

      const items = [
        ...dealPayments.map((p) => ({
          kind: "payment" as const,
          id: p.id,
          payment: { status: p.status, dueDate: p.dueDate, dueAlertSentAt: p.dueAlertSentAt },
          who: p.deal.contact ? `${p.deal.contact.firstName} ${p.deal.contact.lastName ?? ""}`.trim() : p.deal.title,
          amount: p.amount,
          currency: p.currency,
        })),
        ...clientPayments.map((p) => ({
          kind: "clientPayment" as const,
          id: p.id,
          payment: {
            status: p.status,
            dueDate: p.dueDate ?? monthlyDueDate({ year: p.year, month: p.month, billingDay: p.client.billingDay }),
            dueAlertSentAt: p.dueAlertSentAt,
          },
          who: p.client.name,
          amount: p.amount,
          currency: p.currency,
        })),
      ];

      for (const item of items) {
        if (!needsDueAlert(item.payment, now, tz)) continue;
        const days = daysUntilDue(item.payment, now, tz) ?? 0;
        const ok = await sendWhatsAppNotification(
          bot.phone,
          bot.apiKey,
          dueAlertMessage({ who: item.who, amount: item.amount, currency: item.currency, days }),
        );
        if (!ok) {
          failed.push(item.id);
          continue;
        }
        const data = { dueAlertSentAt: now };
        if (item.kind === "payment") await prisma.payment.update({ where: { id: item.id }, data });
        else await prisma.clientPayment.update({ where: { id: item.id }, data });
        alerted++;
      }
    }

    return NextResponse.json({ alerted, failed });
  } catch (error) {
    console.error("GET /api/cron/payment-alerts error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
