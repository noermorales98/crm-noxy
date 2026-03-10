import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";
import nodemailer from "nodemailer";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const session = await auth();
    if (!session?.user?.id) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOrganizationId = (session as any).currentOrganizationId;
    if (!currentOrganizationId) {
      return NextResponse.json({ error: "No organization context" }, { status: 400 });
    }

    // Verify company belongs to organization
    const company = await prisma.company.findUnique({
      where: { id },
      select: { organizationId: true }
    });

    if (!company || company.organizationId !== currentOrganizationId) {
       return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const body = await req.json();
    const { testEmail, smtpHost, smtpPort, smtpUser, smtpPass, smtpFromEmail, smtpSecure } = body;

    if (!testEmail || !smtpHost || !smtpPort || !smtpUser) {
        return NextResponse.json({ error: "Missing required SMTP parameters for testing" }, { status: 400 });
    }

    // Attempt connection and sending a test mail without needing to save to DB first
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort, 10) || 465,
      secure: smtpSecure ?? true,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    // Verify SMTP connection config
    await transporter.verify();

    // Send the test email
    const info = await transporter.sendMail({
      from: `"${smtpUser}" <${smtpFromEmail || smtpUser}>`,
      to: testEmail,
      subject: "Test Connection - CRM Noxy",
      html: "<p>Hello!</p><p>If you are seeing this, your SMTP settings have been configured successfully in your CRM.</p>",
    });

    return NextResponse.json({ message: "Test email sent successfully!", messageId: info.messageId }, { status: 200 });

  } catch (error: any) {
    console.error("POST /api/companies/[id]/smtp/test error:", error);
    return NextResponse.json({ error: error.message || "Failed to authenticate or send test email." }, { status: 500 });
  }
}
