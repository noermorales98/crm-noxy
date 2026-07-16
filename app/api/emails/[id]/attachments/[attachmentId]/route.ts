import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

function sanitizeFilenameForHeader(filename: string): string {
  // Strip quotes and control characters — a sender-controlled filename must never
  // be able to inject extra HTTP header fields via CRLF or unescaped quotes.
  return filename.replace(/[\r\n"]/g, "").trim() || "adjunto";
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const { attachmentId } = await context.params;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOrganizationId = (session as any).currentOrganizationId;
    if (!currentOrganizationId) {
      return NextResponse.json({ error: "No organization context" }, { status: 400 });
    }

    const attachment = await prisma.emailAttachment.findUnique({
      where: { id: attachmentId },
      include: { email: { select: { organizationId: true } } },
    });

    if (!attachment || attachment.email.organizationId !== currentOrganizationId) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    const safeName = sanitizeFilenameForHeader(attachment.filename);
    const encodedName = encodeURIComponent(attachment.filename);

    return new NextResponse(new Uint8Array(attachment.content), {
      status: 200,
      headers: {
        "Content-Type": attachment.contentType,
        "Content-Disposition": `attachment; filename="${safeName}"; filename*=UTF-8''${encodedName}`,
        "Content-Length": String(attachment.content.length),
      },
    });
  } catch (error: any) {
    console.error("GET /api/emails/[id]/attachments/[attachmentId] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
