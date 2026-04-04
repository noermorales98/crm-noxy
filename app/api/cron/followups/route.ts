import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { sendWhatsAppNotification } from "@/src/lib/whatsapp";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Deals with follow-up due in the last 24h, not in won/lost stages
    const deals = await prisma.deal.findMany({
      where: {
        followUpAt: { gte: twentyFourHoursAgo, lte: now },
        stage: { isWon: false, isLost: false },
      },
      include: {
        contact: { select: { firstName: true, lastName: true } },
        organization: {
          include: {
            members: {
              where: { role: "OWNER" },
              include: {
                user: {
                  include: { callMeBot: true },
                },
              },
              take: 1,
            },
          },
        },
      },
    });

    let notified = 0;
    const errors: string[] = [];

    for (const deal of deals) {
      const owner = deal.organization.members[0]?.user;
      if (!owner?.callMeBot?.phone || !owner?.callMeBot?.apiKey) continue;

      const contactName = deal.contact
        ? `${deal.contact.firstName} ${deal.contact.lastName || ""}`.trim()
        : "Sin contacto";

      const followUpDate = deal.followUpAt
        ? new Date(deal.followUpAt).toLocaleDateString("es-MX")
        : "";

      const message =
        `⏰ Follow-up vencido en Noxy CRM\n` +
        `📌 ${deal.title}\n` +
        `👤 ${contactName}\n` +
        `💰 $${deal.value ?? 0} ${deal.currency}\n` +
        `📅 Fecha: ${followUpDate}`;

      const sent = await sendWhatsAppNotification(owner.callMeBot.phone, owner.callMeBot.apiKey, message);
      if (sent) notified++;
      else errors.push(deal.id);
    }

    return NextResponse.json({
      processed: deals.length,
      notified,
      errors,
    });
  } catch (error) {
    console.error("GET /api/cron/followups error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
