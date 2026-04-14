import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

const ENTITY_LABELS: Record<string, string> = {
  PROJECT: "Proyecto",
  FORM: "Formulario",
  CLIENT: "Cliente",
  COMPANY: "Empresa",
  APPOINTMENT_TYPE: "Tipo de Cita",
  CONTACT: "Contacto",
  DEAL: "Negocio",
};

export async function GET(req: Request) {
  const session = await auth();
  const orgId = (session as any)?.currentOrganizationId as string | undefined;
  if (!session?.user || !orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const type = searchParams.get("type") || "";

  const where = { organizationId: orgId };
  const take = 20;
  const results: { id: string; label: string; type: string; typeLabel: string }[] = [];

  const addResults = (items: { id: string; label: string }[], entityType: string) => {
    items.forEach((item) =>
      results.push({ id: item.id, label: item.label, type: entityType, typeLabel: ENTITY_LABELS[entityType] || entityType })
    );
  };

  if (!type || type === "PROJECT") {
    const items = await prisma.project.findMany({
      where: { ...where, name: q ? { contains: q } : undefined },
      select: { id: true, name: true },
      take,
    });
    addResults(items.map((i) => ({ id: i.id, label: i.name })), "PROJECT");
  }

  if (!type || type === "FORM") {
    const items = await prisma.form.findMany({
      where: { ...where, name: q ? { contains: q } : undefined },
      select: { id: true, name: true },
      take,
    });
    addResults(items.map((i) => ({ id: i.id, label: i.name })), "FORM");
  }

  if (!type || type === "CLIENT") {
    const items = await prisma.client.findMany({
      where: { ...where, name: q ? { contains: q } : undefined },
      select: { id: true, name: true },
      take,
    });
    addResults(items.map((i) => ({ id: i.id, label: i.name })), "CLIENT");
  }

  if (!type || type === "COMPANY") {
    const items = await prisma.company.findMany({
      where: { ...where, name: q ? { contains: q } : undefined },
      select: { id: true, name: true },
      take,
    });
    addResults(items.map((i) => ({ id: i.id, label: i.name })), "COMPANY");
  }

  if (!type || type === "APPOINTMENT_TYPE") {
    const items = await prisma.appointmentType.findMany({
      where: { ...where, name: q ? { contains: q } : undefined },
      select: { id: true, name: true },
      take,
    });
    addResults(items.map((i) => ({ id: i.id, label: i.name })), "APPOINTMENT_TYPE");
  }

  if (!type || type === "CONTACT") {
    const items = await prisma.contact.findMany({
      where: {
        ...where,
        ...(q ? { OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }, { email: { contains: q } }] } : {}),
      },
      select: { id: true, firstName: true, lastName: true, email: true },
      take,
    });
    addResults(
      items.map((i) => ({ id: i.id, label: `${i.firstName} ${i.lastName || ""}`.trim() + (i.email ? ` (${i.email})` : "") })),
      "CONTACT"
    );
  }

  if (!type || type === "DEAL") {
    const items = await prisma.deal.findMany({
      where: { ...where, title: q ? { contains: q } : undefined },
      select: { id: true, title: true },
      take,
    });
    addResults(items.map((i) => ({ id: i.id, label: i.title })), "DEAL");
  }

  return NextResponse.json(results);
}
