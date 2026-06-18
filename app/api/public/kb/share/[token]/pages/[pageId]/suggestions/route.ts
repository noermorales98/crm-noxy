import { NextResponse } from "next/server";
import type { KbSuggestionType } from "@prisma/client";
import { prisma } from "@/src/lib/db";
import { ShareAccessError, assertSharePageAccess } from "@/src/lib/kb-share-access";
import { resolveSuggestionOffsets } from "@/src/lib/kb-suggestions";

type Params = { params: Promise<{ token: string; pageId: string }> };

const VALID_TYPES: KbSuggestionType[] = ["COMMENT", "REPLACE", "DELETE", "INSERT"];

function publicJson(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Content-Type", "application/json");
  return new NextResponse(JSON.stringify(body), { ...init, headers });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    },
  });
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { token, pageId } = await params;
    await assertSharePageAccess(token, pageId, "COMMENTATOR");

    const suggestions = await prisma.kbSuggestion.findMany({
      where: { pageId, status: "PENDING" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        authorName: true,
        type: true,
        startOffset: true,
        endOffset: true,
        selectedText: true,
        suggestedText: true,
        comment: true,
        status: true,
        createdAt: true,
      },
    });

    return publicJson(suggestions);
  } catch (err) {
    if (err instanceof ShareAccessError) {
      return publicJson({ error: err.message }, { status: err.status });
    }
    console.error("[public kb suggestions GET]", err);
    return publicJson({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    const { token, pageId } = await params;
    const { share, page } = await assertSharePageAccess(token, pageId, "COMMENTATOR");

    if (page.isFolder) {
      return publicJson({ error: "No se pueden añadir sugerencias a una carpeta" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const authorName = typeof body.authorName === "string" ? body.authorName.trim() : "";
    if (!authorName) {
      return publicJson({ error: "El nombre es obligatorio" }, { status: 400 });
    }

    const type = body.type as KbSuggestionType;
    if (!VALID_TYPES.includes(type)) {
      return publicJson({ error: "Tipo inválido" }, { status: 400 });
    }

    const content = page.content ?? "";
    const offsets = resolveSuggestionOffsets(content, {
      type,
      authorName,
      authorEmail: body.authorEmail,
      selectedText: body.selectedText,
      suggestedText: body.suggestedText,
      comment: body.comment,
      startOffset: body.startOffset,
      endOffset: body.endOffset,
      hintOffset: body.hintOffset,
    });

    if (type !== "COMMENT" && offsets.startOffset === null) {
      return publicJson({ error: "No se pudo anclar la selección en el documento" }, { status: 400 });
    }

    const suggestion = await prisma.kbSuggestion.create({
      data: {
        organizationId: share.organizationId,
        pageId,
        authorName,
        authorEmail: typeof body.authorEmail === "string" ? body.authorEmail.trim() || null : null,
        type,
        startOffset: offsets.startOffset,
        endOffset: offsets.endOffset,
        selectedText: body.selectedText ?? null,
        suggestedText: body.suggestedText ?? null,
        comment: body.comment ?? null,
      },
    });

    return publicJson(suggestion, { status: 201 });
  } catch (err) {
    if (err instanceof ShareAccessError) {
      return publicJson({ error: err.message }, { status: err.status });
    }
    console.error("[public kb suggestions POST]", err);
    return publicJson({ error: "Error del servidor" }, { status: 500 });
  }
}
