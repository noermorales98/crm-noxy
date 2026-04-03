import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOrganizationId = (session as any).currentOrganizationId;
    if (!currentOrganizationId) {
      return NextResponse.json({ error: "No organization context" }, { status: 400 });
    }

    const body = await req.json();
    const { companyId, to, cc, subject, bodyHtml, bodyText } = body;

    if (!companyId || !to || !subject || !bodyHtml) {
      return NextResponse.json({ error: "companyId, to, subject and bodyHtml are required" }, { status: 400 });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        organizationId: true,
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        smtpPass: true,
        smtpFromEmail: true,
        smtpSecure: true,
      },
    });

    if (!company || company.organizationId !== currentOrganizationId) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    if (!company.smtpHost || !company.smtpUser || !company.smtpPass) {
      return NextResponse.json(
        { error: "Esta empresa no tiene SMTP configurado. Configúralo en la sección de Empresas." },
        { status: 422 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: company.smtpHost,
      port: company.smtpPort || 465,
      secure: company.smtpSecure ?? true,
      auth: { user: company.smtpUser, pass: company.smtpPass },
    });

    const mailOptions: any = {
      from: `"${company.name}" <${company.smtpFromEmail || company.smtpUser}>`,
      to,
      subject,
      html: bodyHtml,
      text: bodyText || "",
    };
    if (cc) mailOptions.cc = cc;

    const info = await transporter.sendMail(mailOptions);

    // Save sent email to DB
    const sentEmail = await prisma.email.create({
      data: {
        messageId: info.messageId || null,
        subject,
        fromAddress: company.smtpFromEmail || company.smtpUser!,
        fromName: company.name,
        toAddress: to,
        ccAddress: cc || null,
        bodyHtml,
        bodyText: bodyText || null,
        type: "SENT",
        isRead: true,
        companyId: company.id,
        organizationId: currentOrganizationId,
        receivedAt: new Date(),
      },
    });

    return NextResponse.json({ message: "Email enviado exitosamente", email: sentEmail }, { status: 200 });
  } catch (error: any) {
    console.error("POST /api/emails/send error:", error);
    return NextResponse.json({ error: error.message || "Error al enviar el correo" }, { status: 500 });
  }
}
