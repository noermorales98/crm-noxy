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

    // No exponer credenciales: ni SMTP ni las claves de Stripe (solo enmascaradas)
    const { defaultSenderCompany, stripeSecretKey, stripeWebhookSecret, ...rest } = settings as any;
    const mask = (key: string | null) =>
      key ? `${key.slice(0, 8)}…${key.slice(-4)}` : null;
    return NextResponse.json({
      ...rest,
      stripeSecretKeyMasked: mask(stripeSecretKey),
      stripeWebhookSecretMasked: mask(stripeWebhookSecret),
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

    // Claves de Stripe: string no vacío = guardar, null = quitar, omitido = conservar
    for (const keyField of ["stripeSecretKey", "stripeWebhookSecret"] as const) {
      if (keyField in body) {
        const value = body[keyField];
        if (value === null) {
          data[keyField] = null;
        } else if (typeof value === "string" && value.trim()) {
          data[keyField] = value.trim();
        }
      }
    }

    const settings = await prisma.quoteSettings.upsert({
      where: { organizationId },
      update: data,
      create: { organizationId, ...data },
    });

    // Responder sin las claves en claro
    const { stripeSecretKey, stripeWebhookSecret, ...safe } = settings as any;
    return NextResponse.json(safe);
  } catch (error) {
    console.error("PUT /api/quote-settings error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
