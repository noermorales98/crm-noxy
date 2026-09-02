import { prisma } from "@/src/lib/db";
import nodemailer from "nodemailer";

export type ProcessCampaignEmailsResult = {
  processed: number;
  successful: number;
  failed: number;
  pending: number;
};

export async function processCampaignEmails(opts?: {
  organizationId?: string;
  campaignId?: string;
  take?: number;
}): Promise<ProcessCampaignEmailsResult> {
  const take = opts?.take ?? 50;
  const now = new Date();

  const pendingLogs = await prisma.emailLog.findMany({
    where: {
      status: "PENDING",
      OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }],
      ...(opts?.campaignId ? { campaignId: opts.campaignId } : {}),
      ...(opts?.organizationId
        ? { campaign: { organizationId: opts.organizationId } }
        : {}),
    },
    take,
    include: {
      campaign: { include: { company: true } },
      contact: true,
      step: true,
    },
  });

  if (pendingLogs.length === 0) {
    const pending = await countDuePending(opts?.organizationId, opts?.campaignId);
    return { processed: 0, successful: 0, failed: 0, pending };
  }

  let successful = 0;
  let failed = 0;

  for (const log of pendingLogs) {
    if (!log.contact.email) {
      await prisma.emailLog.update({
        where: { id: log.id },
        data: { status: "FAILED", errorReason: "El contacto no tiene correo." },
      });
      failed++;
      continue;
    }

    const company = log.campaign.company;
    if (!company.smtpHost || !company.smtpUser || !company.smtpPass) {
      await prisma.emailLog.update({
        where: { id: log.id },
        data: { status: "FAILED", errorReason: "Company SMTP credentials not configured." },
      });
      failed++;
      continue;
    }

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
        data: { status: "SENT", sentAt: new Date() },
      });
      successful++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to transport message";
      await prisma.emailLog.update({
        where: { id: log.id },
        data: { status: "FAILED", errorReason: message },
      });
      failed++;
    }
  }

  const campaignIds = [...new Set(pendingLogs.map((l) => l.campaignId))];
  for (const cid of campaignIds) {
    const remainingPending = await prisma.emailLog.count({
      where: { campaignId: cid, status: "PENDING" },
    });
    if (remainingPending === 0) {
      await prisma.emailCampaign.update({
        where: { id: cid },
        data: { status: "COMPLETED" },
      });
    }
  }

  const pending = await countDuePending(opts?.organizationId, opts?.campaignId);
  return {
    processed: pendingLogs.length,
    successful,
    failed,
    pending,
  };
}

async function countDuePending(organizationId?: string, campaignId?: string) {
  const now = new Date();
  return prisma.emailLog.count({
    where: {
      status: "PENDING",
      OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }],
      ...(campaignId ? { campaignId } : {}),
      ...(organizationId ? { campaign: { organizationId } } : {}),
    },
  });
}
