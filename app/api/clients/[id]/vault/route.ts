import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;

    const entries = await prisma.clientVaultEntry.findMany({
      where: { clientId: id, organizationId },
      orderBy: [{ type: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(entries);
  } catch (e) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;

    const client = await prisma.client.findFirst({ where: { id, organizationId } });
    if (!client) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

    const { type, label, username, password, url, notes } = await req.json();
    if (!label) return NextResponse.json({ error: "label requerido" }, { status: 400 });

    const entry = await prisma.clientVaultEntry.create({
      data: { type: type || "credential", label, username: username || null, password: password || null, url: url || null, notes: notes || null, clientId: id, organizationId },
    });
    return NextResponse.json(entry, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;

    const { entryId, ...fields } = await req.json();
    if (!entryId) return NextResponse.json({ error: "entryId requerido" }, { status: 400 });

    const existing = await prisma.clientVaultEntry.findFirst({ where: { id: entryId, clientId: id, organizationId } });
    if (!existing) return NextResponse.json({ error: "Entrada no encontrada" }, { status: 404 });

    const updateData: Record<string, any> = {};
    for (const k of ["type", "label", "username", "password", "url", "notes"] as const) {
      if (fields[k] !== undefined) updateData[k] = fields[k] ?? null;
    }

    const entry = await prisma.clientVaultEntry.update({ where: { id: entryId }, data: updateData });
    return NextResponse.json(entry);
  } catch (e) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const organizationId = (session as any).currentOrganizationId;

    const { entryId } = await req.json();
    const existing = await prisma.clientVaultEntry.findFirst({ where: { id: entryId, clientId: id, organizationId } });
    if (!existing) return NextResponse.json({ error: "Entrada no encontrada" }, { status: 404 });

    await prisma.clientVaultEntry.delete({ where: { id: entryId } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
