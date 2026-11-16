import { prisma } from "./db";
import { coerceVideoRow, type VideoImportRow } from "./video-fields";

export { coerceVideoRow } from "./video-fields";
export type { VideoImportRow } from "./video-fields";

/** Crea videos desde filas ya normalizadas, omitiendo duplicados (mismo título + plataforma + fecha). */
export async function createVideosFromRows(organizationId: string, rows: VideoImportRow[]) {
  let created = 0;
  let skipped = 0;
  for (const row of rows) {
    const data = coerceVideoRow(row);
    if (!data) {
      skipped++;
      continue;
    }
    const duplicate = await prisma.video.findFirst({
      where: { organizationId, title: data.title, platform: data.platform, publishedAt: data.publishedAt ?? null },
      select: { id: true },
    });
    if (duplicate) {
      skipped++;
      continue;
    }
    await prisma.video.create({ data: { organizationId, ...data } as never });
    created++;
  }
  return { created, skipped };
}

/** Valida el cuerpo del formulario manual (alta o edición). Devuelve los campos o un error. */
export async function parseVideoFormBody(
  organizationId: string,
  body: Record<string, unknown>,
): Promise<{ data?: Record<string, unknown>; error?: string }> {
  const data = coerceVideoRow(body as VideoImportRow);
  if (!data) return { error: "Título y plataforma requeridos" };

  for (const [key, model] of [["clientId", "client"], ["contentClientId", "contentClient"], ["contentItemId", "contentItem"]] as const) {
    if (body[key]) {
      const exists = await (prisma[model] as { findFirst: (args: unknown) => Promise<{ id: string } | null> }).findFirst({
        where: { id: body[key], organizationId },
        select: { id: true },
      });
      if (!exists) return { error: `${key} no autorizado` };
      data[key] = body[key];
    } else if (body[key] === null) {
      data[key] = null; // desvincular explícitamente
    }
  }

  if (data.contentClientId && data.contentItemId) {
    const item = await prisma.contentItem.findFirst({
      where: { id: data.contentItemId as string, organizationId },
      select: { clientId: true },
    });
    if (!item || item.clientId !== data.contentClientId) return { error: "La pieza no pertenece al cliente elegido" };
  }

  return { data };
}
