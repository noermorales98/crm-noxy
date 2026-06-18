import { NextResponse } from "next/server";
import {
  ShareAccessError,
  assertSharePageAccess,
  toPublicPagePayload,
} from "@/src/lib/kb-share-access";
import { prisma } from "@/src/lib/db";

type Params = { params: Promise<{ token: string; pageId: string }> };

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
      "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
    },
  });
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { token, pageId } = await params;
    const { share, page } = await assertSharePageAccess(token, pageId, "READER");

    return publicJson({
      ...toPublicPagePayload(page),
      role: share.role,
      rootPageId: share.pageId,
    });
  } catch (err) {
    if (err instanceof ShareAccessError) {
      return publicJson({ error: err.message }, { status: err.status });
    }
    console.error("[public kb page GET]", err);
    return publicJson({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { token, pageId } = await params;
    const { share, page } = await assertSharePageAccess(token, pageId, "EDITOR");

    if (page.isFolder) {
      return publicJson({ error: "No se puede editar una carpeta como documento" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const data: { title?: string; content?: string } = {};
    if (typeof body.title === "string") data.title = body.title.slice(0, 500);
    if (typeof body.content === "string") data.content = body.content;

    if (Object.keys(data).length === 0) {
      return publicJson({ error: "Nada que actualizar" }, { status: 400 });
    }

    await prisma.kbPage.updateMany({
      where: { id: pageId, organizationId: share.organizationId },
      data,
    });

    const updated = await prisma.kbPage.findFirst({
      where: { id: pageId, organizationId: share.organizationId },
    });
    if (!updated) return publicJson({ error: "Not found" }, { status: 404 });

    return publicJson(toPublicPagePayload(updated));
  } catch (err) {
    if (err instanceof ShareAccessError) {
      return publicJson({ error: err.message }, { status: err.status });
    }
    console.error("[public kb page PATCH]", err);
    return publicJson({ error: "Error del servidor" }, { status: 500 });
  }
}
