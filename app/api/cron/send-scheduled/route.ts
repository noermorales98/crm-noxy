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

    // Find scheduled emails that are ready to send (scheduledAt <= now, not yet sent = messageId IS null)
    const pendingEmails = await prisma.email.findMany({
      where: {
        scheduledAt: { lte: now, not: null },
        messageId: null,
        type: "SENT",
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            smtpHost: true,
            smtpPort: true,
            smtpUser: true,
            smtpPass: true,
            smtpFromEmail: true,
            smtpSecure: true,
          },
        },
      },
      take: 50,
    });

    if (pendingEmails.length === 0) {
      return NextResponse.json({ message: "No scheduled emails ready to send", sent: 0 });
    }

    let sent = 0;
    const errors: string[] = [];

    for (const email of pendingEmails) {
      const company = email.company;
      if (!company.smtpHost || !company.smtpUser || !company.smtpPass) {
        errors.push(email.id);
        continue;
      }

      try {
        const transporter = nodemailer.createTransport({
          host: company.smtpHost,
          port: company.smtpPort || 465,
          secure: company.smtpSecure ?? true,
          auth: { user: company.smtpUser, pass: company.smtpPass },
        });

        const mailOptions: any = {
          from: `"${company.name}" <${company.smtpFromEmail || company.smtpUser}>`,
          to: email.toAddress,
          subject: email.subject,
          html: email.bodyHtml || "",
          text: email.bodyText || "",
        };
        if (email.ccAddress) mailOptions.cc = email.ccAddress;

        const info = await transporter.sendMail(mailOptions);

        await prisma.email.update({
          where: { id: email.id },
          data: { messageId: info.messageId || `sent-${Date.now()}` },
        });
        sent++;
      } catch (err: any) {
        console.error(`Failed to send scheduled email ${email.id}:`, err.message);
        errors.push(email.id);
      }
    }

    return NextResponse.json({ processed: pendingEmails.length, sent, errors });
  } catch (error: any) {
    console.error("GET /api/cron/send-scheduled error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
