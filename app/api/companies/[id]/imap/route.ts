import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

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

    const company = await prisma.company.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
        imapHost: true,
        imapPort: true,
        imapUser: true,
        imapSecure: true,
      },
    });

    if (!company || company.organizationId !== currentOrganizationId) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json(company, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/companies/[id]/imap error:", error);
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

    const company = await prisma.company.findUnique({
      where: { id },
      select: { organizationId: true },
    });

    if (!company || company.organizationId !== currentOrganizationId) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const body = await req.json();
    const { imapHost, imapPort, imapUser, imapPass, imapSecure } = body;

    const dataToUpdate: any = {
      imapHost: imapHost || null,
      imapPort: imapPort ? parseInt(imapPort, 10) : null,
      imapUser: imapUser || null,
      imapSecure: imapSecure ?? true,
    };

    if (imapPass) {
      dataToUpdate.imapPass = imapPass;
    }

    const updatedCompany = await prisma.company.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        imapHost: true,
        imapPort: true,
        imapUser: true,
        imapSecure: true,
      },
    });

    return NextResponse.json(
      { message: "IMAP settings saved successfully", company: updatedCompany },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("PATCH /api/companies/[id]/imap error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
