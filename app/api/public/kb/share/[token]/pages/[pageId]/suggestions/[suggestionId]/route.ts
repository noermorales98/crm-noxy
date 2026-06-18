import { NextResponse } from "next/server";
import type { KbSuggestionType } from "@prisma/client";
import { prisma } from "@/src/lib/db";
import { ShareAccessError, assertSharePageAccess } from "@/src/lib/kb-share-access";

type Params = { params: Promise<{ token: string; pageId: string; suggestionId: string }> };

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
      "Access-Control-Allow-Methods": "PATCH, DELETE, OPTIONS",
    },
  });
}

const SUGGESTION_SELECT = {
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
} as const;

async function loadOwnedPendingSuggestion(
  token: string,
  pageId: string,
  suggestionId: string,
  authorName: string
) {
  await assertSharePageAccess(token, pageId, "COMMENTATOR");

  const suggestion = await prisma.kbSuggestion.findFirst({
    where: { id: suggestionId, pageId },
  });

  if (!suggestion) {
    throw new ShareAccessError("Sugerencia no encontrada", 404);
  }
  if (suggestion.status !== "PENDING") {
    throw new ShareAccessError("La sugerencia ya fue resuelta", 400);
  }
  if (suggestion.authorName !== authorName) {
    throw new ShareAccessError("Solo puedes modificar tus propios comentarios", 403);
  }

  return suggestion;
}

function validateSuggestionFields(type: KbSuggestionType, suggestedText?: unknown, comment?: unknown) {
  if (type === "REPLACE") {
    const text = typeof suggestedText === "string" ? suggestedText : "";
    if (!text.trim()) {
      return "El texto propuesto es obligatorio para sugerencias de reemplazo";
    }
  }
  if (type === "COMMENT" && comment !== undefined && comment !== null && typeof comment !== "string") {
    return "Comentario inválido";
  }
  return null;
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { token, pageId, suggestionId } = await params;
    const body = await req.json().catch(() => ({}));
    const authorName = typeof body.authorName === "string" ? body.authorName.trim() : "";
    if (!authorName) {
      return publicJson({ error: "El nombre es obligatorio" }, { status: 400 });
    }

    const existing = await loadOwnedPendingSuggestion(token, pageId, suggestionId, authorName);

    const type = (body.type as KbSuggestionType) ?? existing.type;
    if (!VALID_TYPES.includes(type)) {
      return publicJson({ error: "Tipo inválido" }, { status: 400 });
    }

    const suggestedText =
      body.suggestedText !== undefined
        ? typeof body.suggestedText === "string"
          ? body.suggestedText
          : null
        : existing.suggestedText;
    const comment =
      body.comment !== undefined
        ? typeof body.comment === "string"
          ? body.comment.trim() || null
          : null
        : existing.comment;

    const fieldError = validateSuggestionFields(type, suggestedText, comment);
    if (fieldError) {
      return publicJson({ error: fieldError }, { status: 400 });
    }

    const updated = await prisma.kbSuggestion.update({
      where: { id: suggestionId },
      data: {
        type,
        suggestedText: type === "REPLACE" ? suggestedText : type === "DELETE" ? "" : suggestedText,
        comment,
      },
      select: SUGGESTION_SELECT,
    });

    return publicJson(updated);
  } catch (err) {
    if (err instanceof ShareAccessError) {
      return publicJson({ error: err.message }, { status: err.status });
    }
    console.error("[public kb suggestions PATCH]", err);
    return publicJson({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: Params) {
  try {
    const { token, pageId, suggestionId } = await params;
    const body = await req.json().catch(() => ({}));
    const authorName = typeof body.authorName === "string" ? body.authorName.trim() : "";
    if (!authorName) {
      return publicJson({ error: "El nombre es obligatorio" }, { status: 400 });
    }

    await loadOwnedPendingSuggestion(token, pageId, suggestionId, authorName);

    await prisma.kbSuggestion.delete({ where: { id: suggestionId } });

    return publicJson({ ok: true });
  } catch (err) {
    if (err instanceof ShareAccessError) {
      return publicJson({ error: err.message }, { status: err.status });
    }
    console.error("[public kb suggestions DELETE]", err);
    return publicJson({ error: "Error del servidor" }, { status: 500 });
  }
}
