import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

const FIELDS = [
  "businessName", "logoUrl", "taxId", "address", "phone", "email", "website",
  "bankName", "bankBeneficiary", "bankClabe", "bankReference",
  "defaultTaxRate", "defaultCurrency", "defaultTerms",
] as const;

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;
    if (!organizationId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

    const settings = await prisma.quoteSettings.findUnique({
      where: { organizationId },
      include: { defaultSenderCompany: { select: { id: true, name: true, smtpHost: true } } },
    });
    if (!settings) return NextResponse.json({});

    // No exponer credenciales SMTP; solo si la empresa tiene SMTP configurado
    const { defaultSenderCompany, ...rest } = settings as any;
    return NextResponse.json({
      ...rest,
      defaultSenderCompany: defaultSenderCompany
        ? { id: defaultSenderCompany.id, name: defaultSenderCompany.name, hasSmtp: !!defaultSenderCompany.smtpHost }
        : null,
    });
  } catch (error) {
    console.error("GET /api/quote-settings error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;
    if (!organizationId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

    const body = await req.json();
    const data: Record<string, unknown> = {};
    for (const field of FIELDS) {
      if (field in body) {
        if (field === "defaultTaxRate") {
          const rate = Number(body[field]);
          if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
            return NextResponse.json({ error: "La tasa de impuesto debe ser un número entre 0 y 100" }, { status: 400 });
          }
          data[field] = rate;
        } else {
          data[field] = body[field] === "" ? null : body[field];
        }
      }
    }

    if ("defaultSenderCompanyId" in body) {
      if (body.defaultSenderCompanyId) {
        const company = await prisma.company.findFirst({
          where: { id: body.defaultSenderCompanyId, organizationId },
        });
        if (!company) return NextResponse.json({ error: "Empresa inválida" }, { status: 400 });
        data.defaultSenderCompanyId = company.id;
      } else {
        data.defaultSenderCompanyId = null;
      }
    }

    const settings = await prisma.quoteSettings.upsert({
      where: { organizationId },
      update: data,
      create: { organizationId, ...data },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("PUT /api/quote-settings error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
