import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { applySuggestionToContent } from "@/src/lib/kb-suggestions";

type Params = { params: Promise<{ id: string; suggestionId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  const orgId = (session as { currentOrganizationId?: string })?.currentOrganizationId;
  const userId = session?.user?.id;
  if (!session?.user || !orgId || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, suggestionId } = await params;
  const body = await req.json().catch(() => ({}));
  const action = body.action as "accept" | "reject";

  if (action !== "accept" && action !== "reject") {
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  }

  const suggestion = await prisma.kbSuggestion.findFirst({
    where: { id: suggestionId, pageId: id, organizationId: orgId },
  });
  if (!suggestion) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (suggestion.status !== "PENDING") {
    return NextResponse.json({ error: "La sugerencia ya fue resuelta" }, { status: 400 });
  }

  if (action === "reject") {
    const updated = await prisma.kbSuggestion.update({
      where: { id: suggestionId },
      data: { status: "REJECTED", resolvedBy: userId, resolvedAt: new Date() },
    });
    return NextResponse.json(updated);
  }

  const page = await prisma.kbPage.findFirst({
    where: { id, organizationId: orgId },
    select: { content: true },
  });
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const content = page.content ?? "";
  const result = applySuggestionToContent(content, suggestion);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 409 });
  }

  const [updatedPage] = await prisma.$transaction([
    prisma.kbPage.updateMany({
      where: { id, organizationId: orgId },
      data: { content: result.content },
    }),
    prisma.kbSuggestion.update({
      where: { id: suggestionId },
      data: { status: "ACCEPTED", resolvedBy: userId, resolvedAt: new Date() },
    }),
  ]);

  if (updatedPage.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.kbSuggestion.findUnique({ where: { id: suggestionId } });
  return NextResponse.json({ suggestion: updated, content: result.content });
}
