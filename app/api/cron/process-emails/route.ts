import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import nodemailer from "nodemailer";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    // Solo los envíos pendientes que ya vencieron (sin fecha programada o con fecha pasada)
    const pendingLogs = await prisma.emailLog.findMany({
      where: {
        status: "PENDING",
        OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }],
      },
      take: 50,
      include: {
        campaign: {
          include: {
             company: true // We need the custom SMTP config!
          }
        },
        contact: true,
        step: true // subject/body del mensaje de la secuencia (null = mensaje 1)
      }
    });

    if (pendingLogs.length === 0) {
      return NextResponse.json({ message: "No pending emails to process" }, { status: 200 });
    }

    let successCount = 0;
    let failedCount = 0;

    for (const log of pendingLogs) {
      if (!log.contact.email) continue;
      
      const company = log.campaign.company;
      if (!company.smtpHost || !company.smtpUser || !company.smtpPass) {
        // Skip or fail if company hasn't set up SMTP
        await prisma.emailLog.update({
          where: { id: log.id },
          data: { status: "FAILED", errorReason: "Company SMTP credentials not configured." }
        });
        failedCount++;
        continue;
      }

      // Create a dynamic transporter for this specific company
      const transporter = nodemailer.createTransport({
        host: company.smtpHost,
        port: company.smtpPort || 465,
        secure: company.smtpSecure ?? true,
        auth: {
          user: company.smtpUser,
          pass: company.smtpPass,
        },
      });

      try {
        // Si el log pertenece a un mensaje de la secuencia, usar su subject/body;
        // si no, los del mensaje principal de la campaña.
        const subject = log.step?.subject ?? log.campaign.subject;
        const html = log.step?.body ?? log.campaign.body;

        await transporter.sendMail({
          from: `"${company.name}" <${company.smtpFromEmail || company.smtpUser}>`,
          to: log.contact.email,
          subject,
          html,
        });

        await prisma.emailLog.update({
          where: { id: log.id },
          data: { status: "SENT", sentAt: new Date() }
        });
        successCount++;
      } catch (err: any) {
        await prisma.emailLog.update({
          where: { id: log.id },
          data: { status: "FAILED", errorReason: err.message || "Failed to transport message" }
        });
        failedCount++;
      }
    }

    // 3. Mark campaigns as COMPLETED only when ALL their logs are no longer
    // PENDING — incluyendo los programados a futuro: la campaña solo se completa
    // cuando se envió el último mensaje de la secuencia.
    // Find unique campaign IDs from this batch
    const campaignIds = [...new Set(pendingLogs.map(l => l.campaignId))];
    for (const cid of campaignIds) {
      const remainingPending = await prisma.emailLog.count({
        where: { campaignId: cid, status: "PENDING" }
      });
      if (remainingPending === 0) {
        await prisma.emailCampaign.update({
          where: { id: cid },
          data: { status: "COMPLETED" }
        });
      }
    }

    return NextResponse.json({
      message: "Batch processed",
      processed: pendingLogs.length,
      successful: successCount,
      failed: failedCount
    }, { status: 200 });

  } catch (error: any) {
    console.error("Cron / process-emails error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
