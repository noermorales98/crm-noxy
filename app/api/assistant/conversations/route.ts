import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session as { currentOrganizationId?: string }).currentOrganizationId;
  if (!orgId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

  await prisma.aiConversation.deleteMany({
    where: {
      userId: session.user.id!,
      organizationId: orgId,
      messages: { none: {} },
    },
  });

  const conversations = await prisma.aiConversation.findMany({
    where: {
      userId: session.user.id!,
      organizationId: orgId,
      messages: { some: {} },
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json(conversations);
}

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session as { currentOrganizationId?: string }).currentOrganizationId;
  if (!orgId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

  const conversation = await prisma.aiConversation.create({
    data: {
      userId: session.user.id!,
      organizationId: orgId,
    },
    select: { id: true, title: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json(conversation, { status: 201 });
}
