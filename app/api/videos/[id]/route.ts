import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { parseVideoFormBody } from "@/src/lib/video-import";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const organizationId = (session as any)?.currentOrganizationId;
  if (!session?.user || !organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.video.findFirst({ where: { id, organizationId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await req.json();
  const { data, error } = await parseVideoFormBody(organizationId, body);
  if (error || !data) return NextResponse.json({ error: error ?? "Datos inválidos" }, { status: 400 });

  const video = await prisma.video.update({ where: { id }, data: data as never });
  return NextResponse.json(video);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const organizationId = (session as any)?.currentOrganizationId;
  if (!session?.user || !organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.video.findFirst({ where: { id, organizationId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await prisma.video.delete({ where: { id } });
  return NextResponse.json({ deleted: 1 });
}
