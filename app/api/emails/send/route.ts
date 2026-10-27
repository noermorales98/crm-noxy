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
    const { companyId, to, cc, subject, bodyHtml, bodyText, scheduledAt, attachments } = body;

    if (!companyId || !to || !subject || !bodyHtml) {
      return NextResponse.json({ error: "companyId, to, subject and bodyHtml are required" }, { status: 400 });
    }

    type AttachmentInput = { filename: string; contentType?: string; data: string };
    let parsedAttachments: { filename: string; contentType: string; content: Buffer }[] = [];
    if (attachments !== undefined) {
      if (!Array.isArray(attachments) || attachments.length > 10) {
        return NextResponse.json({ error: "attachments debe ser un arreglo de máximo 10 archivos" }, { status: 400 });
      }
      const MAX_SIZE = 10 * 1024 * 1024; // 10 MB por archivo
      const MAX_TOTAL = 20 * 1024 * 1024; // 20 MB en total
      let total = 0;
      try {
        parsedAttachments = (attachments as AttachmentInput[]).map((a) => {
          if (!a || typeof a.filename !== "string" || typeof a.data !== "string") {
            throw new Error("Formato de adjunto inválido");
          }
          const content = Buffer.from(a.data, "base64");
          if (content.length === 0) throw new Error(`El adjunto "${a.filename}" está vacío`);
          if (content.length > MAX_SIZE) throw new Error(`El adjunto "${a.filename}" supera 10 MB`);
          total += content.length;
          if (total > MAX_TOTAL) throw new Error("El tamaño total de los adjuntos supera 20 MB");
          return {
            filename: a.filename,
            contentType: a.contentType || "application/octet-stream",
            content,
          };
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Error en los adjuntos";
        return NextResponse.json({ error: message }, { status: 400 });
      }
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

    const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
    const isScheduled = scheduledDate !== null && scheduledDate > new Date();

    let messageIdResult: string | null = null;

    if (!isScheduled) {
      // Send immediately
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
      if (parsedAttachments.length > 0) {
        mailOptions.attachments = parsedAttachments.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        }));
      }

      const info = await transporter.sendMail(mailOptions);
      messageIdResult = info.messageId || null;
    }

    // Save email to DB (with or without messageId for scheduled)
    const sentEmail = await prisma.email.create({
      data: {
        messageId: messageIdResult,
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
        receivedAt: isScheduled ? scheduledDate! : new Date(),
        scheduledAt: isScheduled ? scheduledDate : null,
        ...(parsedAttachments.length > 0
          ? {
              attachments: {
                create: parsedAttachments.map((a) => ({
                  filename: a.filename,
                  contentType: a.contentType,
                  size: a.content.length,
                  content: Uint8Array.from(a.content),
                })),
              },
            }
          : {}),
      },
    });

    return NextResponse.json(
      {
        message: isScheduled ? "Correo programado exitosamente" : "Email enviado exitosamente",
        email: sentEmail,
        scheduled: isScheduled,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("POST /api/emails/send error:", error);
    return NextResponse.json({ error: error.message || "Error al enviar el correo" }, { status: 500 });
  }
}
