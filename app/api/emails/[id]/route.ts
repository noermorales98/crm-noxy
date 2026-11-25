import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";
import { normalizeDraft } from "@/src/lib/email-drafts";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
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

    const email = await prisma.email.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true } },
        attachments: { select: { id: true, filename: true, contentType: true, size: true } },
      },
    });

    if (!email || email.organizationId !== currentOrganizationId) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    // Mark as read automatically on open
    if (!email.isRead) {
      await prisma.email.update({ where: { id }, data: { isRead: true } });
    }

    return NextResponse.json({ ...email, isRead: true }, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/emails/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
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

    const email = await prisma.email.findUnique({
      where: { id },
      select: { organizationId: true, type: true, toAddress: true, ccAddress: true, subject: true, bodyHtml: true },
    });

    if (!email || email.organizationId !== currentOrganizationId) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    const body = await req.json();
    const { isRead, isArchived, isSpam } = body;

    // Editar el contenido solo es posible en borradores: un correo recibido o enviado no se reescribe.
    if (email.type === "DRAFT" && ["to", "cc", "subject", "body", "bodyHtml"].some((k) => k in body)) {
      // Lo que no se envía se conserva: un cambio de asunto no borra el cuerpo.
      const hasBody = "body" in body || "bodyHtml" in body;
      const draft = normalizeDraft({
        to: "to" in body ? body.to : email.toAddress,
        cc: "cc" in body ? body.cc : email.ccAddress,
        subject: "subject" in body ? body.subject : email.subject,
        body: hasBody ? body.body : undefined,
        bodyHtml: hasBody ? body.bodyHtml : email.bodyHtml,
      });
      if (!draft.ok) return NextResponse.json({ error: draft.error }, { status: 400 });
      const saved = await prisma.email.update({ where: { id }, data: draft.data });
      return NextResponse.json(saved, { status: 200 });
    }

    const dataToUpdate: any = {};
    if (typeof isRead === "boolean") dataToUpdate.isRead = isRead;
    if (typeof isArchived === "boolean") dataToUpdate.isArchived = isArchived;
    if (typeof isSpam === "boolean") {
      dataToUpdate.isSpam = isSpam;
      // "No es spam" always lands in Inbox — never try to restore a previous archived state.
      if (isSpam === false) dataToUpdate.isArchived = false;
    }

    const updated = await prisma.email.update({ where: { id }, data: dataToUpdate });
    return NextResponse.json(updated, { status: 200 });
  } catch (error: any) {
    console.error("PATCH /api/emails/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
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

    const email = await prisma.email.findUnique({
      where: { id },
      select: { organizationId: true, companyId: true, messageId: true },
    });

    if (!email || email.organizationId !== currentOrganizationId) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      if (email.messageId) {
        await tx.deletedEmail.upsert({
          where: {
            companyId_messageId: {
              companyId: email.companyId,
              messageId: email.messageId,
            },
          },
          create: {
            messageId: email.messageId,
            companyId: email.companyId,
            organizationId: email.organizationId,
          },
          update: {},
        });
      }
      await tx.email.delete({ where: { id } });
    });

    return NextResponse.json({ message: "Email deleted" }, { status: 200 });
  } catch (error: any) {
    console.error("DELETE /api/emails/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
