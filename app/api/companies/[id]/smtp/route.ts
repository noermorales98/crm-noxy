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
         smtpHost: true,
         smtpPort: true,
         smtpUser: true,
         smtpFromEmail: true,
         smtpSecure: true,
      }
    });

    if (!company || company.organizationId !== currentOrganizationId) {
       return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json(company, { status: 200 });

  } catch (error: any) {
    console.error("GET /api/companies/[id]/smtp error:", error);
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
      select: { organizationId: true }
    });

    if (!company || company.organizationId !== currentOrganizationId) {
       return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const body = await req.json();
    const { smtpHost, smtpPort, smtpUser, smtpPass, smtpFromEmail, smtpSecure } = body;

    const dataToUpdate: any = {
      smtpHost: smtpHost || null,
      smtpPort: smtpPort ? parseInt(smtpPort, 10) : null,
      smtpUser: smtpUser || null,
      smtpFromEmail: smtpFromEmail || null,
      smtpSecure: smtpSecure ?? true
    };

    if (smtpPass) {
       dataToUpdate.smtpPass = smtpPass;
    }

    const updatedCompany = await prisma.company.update({
      where: { id },
      data: dataToUpdate,
      select: {
         id: true,
         smtpHost: true,
         smtpPort: true,
         smtpUser: true,
         smtpFromEmail: true,
         smtpSecure: true,
      }
    });

    return NextResponse.json({ message: "SMTP parameters saved successfully", company: updatedCompany }, { status: 200 });
  } catch (error: any) {
    console.error("PATCH /api/companies/[id]/smtp error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
