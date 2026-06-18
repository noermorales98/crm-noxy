import { NextResponse } from "next/server";
import {
  ShareAccessError,
  buildPublicTree,
  getShareByToken,
} from "@/src/lib/kb-share-access";

type Params = { params: Promise<{ token: string }> };

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
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { token } = await params;
    const share = await getShareByToken(token);
    if (!share) return publicJson({ error: "Enlace no válido" }, { status: 404 });

    const tree =
      share.page.isFolder && share.includeChildren
        ? await buildPublicTree(share.organizationId, share.pageId)
        : [];

    return publicJson({
      role: share.role,
      page: {
        id: share.page.id,
        title: share.page.title,
        isFolder: share.page.isFolder,
      },
      includeChildren: share.includeChildren,
      tree,
    });
  } catch (err) {
    console.error("[public kb share]", err);
    return publicJson({ error: "Error del servidor" }, { status: 500 });
  }
}

export { ShareAccessError };
