import { prisma } from "@/src/lib/db";
import { appSecretKey, decryptSecret } from "@/src/lib/secret-box";

export type NotionEnv = { token: string; databaseId: string };

/** Credenciales de Notion de la organización: primero las guardadas en Ajustes (BD), si no las variables de entorno. */
export async function resolveNotionEnv(organizationId: string): Promise<NotionEnv | null> {
  const row = await prisma.notionConfig.findUnique({ where: { organizationId } });
  if (row) {
    const token = decryptSecret(row.token, appSecretKey());
    if (token) return { token, databaseId: row.databaseId };
  }
  const token = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_LEADS_DATABASE_ID;
  return token && databaseId ? { token, databaseId } : null;
}
