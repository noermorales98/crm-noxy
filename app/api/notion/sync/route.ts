import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { syncBatch, syncDeal, syncDoc, type SyncKind } from "@/src/lib/notion-sync";

export const maxDuration = 60;

/**
 * POST { kind: "deal" | "doc", id }            → envía uno a Notion.
 * POST { kind: "deal" | "doc", offset?: 0 }    → envía un lote; repetir con `nextOffset` hasta que sea null.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const organizationId = (session as { currentOrganizationId?: string }).currentOrganizationId;
  if (!organizationId) return NextResponse.json({ error: "Sin organización" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as { kind?: string; id?: string; offset?: number } | null;
  const kind = body?.kind as SyncKind | undefined;
  if (kind !== "deal" && kind !== "doc") return NextResponse.json({ error: "kind debe ser deal o doc" }, { status: 400 });

  if (body?.id) {
    const outcome = kind === "deal" ? await syncDeal(organizationId, body.id) : await syncDoc(organizationId, body.id);
    return NextResponse.json(outcome, { status: outcome.ok ? 200 : 422 });
  }
  const offset = Number.isInteger(body?.offset) && (body!.offset as number) >= 0 ? (body!.offset as number) : 0;
  return NextResponse.json(await syncBatch(organizationId, kind, offset));
}
