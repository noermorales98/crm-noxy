import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOrganizationId = (session as any).currentOrganizationId;
    if (!currentOrganizationId) {
      return NextResponse.json({ error: "No organization context" }, { status: 400 });
    }

    const body = await req.json();
    const { campaignId } = body;

    if (!campaignId) {
      return NextResponse.json({ error: "Campaign ID is required" }, { status: 400 });
    }

    // Verify campaign belongs to the organization and is currently DRAFT
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign || campaign.organizationId !== currentOrganizationId) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (campaign.status !== "DRAFT") {
      return NextResponse.json({ error: "Campaign is already processing or sent" }, { status: 400 });
    }

    // Fetch all contacts with emails for this specific COMPANY
    const contacts = await prisma.contact.findMany({
      where: {
        companyId: campaign.companyId,
        email: { not: null, notIn: [""] },
      },
      select: { id: true }
    });

    if (contacts.length === 0) {
      return NextResponse.json({ error: "No contacts with valid email addresses found." }, { status: 400 });
    }

    // Build the EmailLog entries
    const logsData = contacts.map(contact => ({
      campaignId: campaignId,
      contactId: contact.id,
      status: "PENDING" as const,
    }));

    // Perform the operation atomically:
    // 1. Mark campaign as SENDING
    // 2. Insert PENDING logs
    await prisma.$transaction([
      prisma.emailCampaign.update({
        where: { id: campaignId },
        data: { status: "SENDING", sentAt: new Date() },
      }),
      prisma.emailLog.createMany({
        data: logsData,
        skipDuplicates: true
      })
    ]);

    // Ideally here we would trigger an external Queue (Upstash QStash, etc)
    // For MVPs, we rely on the Vercel cron job picking up the PENDING logs later
    return NextResponse.json({ message: "Campaign scheduled successfully. Cron will dispatch it shortly.", totalScheduled: contacts.length }, { status: 200 });
  } catch (error: any) {
    console.error("POST /api/campaigns/send error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
