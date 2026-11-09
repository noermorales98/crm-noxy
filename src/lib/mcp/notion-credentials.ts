import { prisma } from "@/src/lib/db";
import { appSecretKey, decryptSecret } from "@/src/lib/secret-box";

export type NotionEnv = { token: string; databaseId: string; docsDatabaseId: string | null };
export type NotionSettings = { env: NotionEnv; autoSyncDeals: boolean; autoSyncDocs: boolean };

/** Credenciales y ajustes de Notion de la organización: primero los guardados en Ajustes (BD), si no las variables de entorno. */
export async function resolveNotionSettings(organizationId: string): Promise<NotionSettings | null> {
  const row = await prisma.notionConfig.findUnique({ where: { organizationId } });
  if (row) {
    const token = decryptSecret(row.token, appSecretKey());
    if (token) {
      return { env: { token, databaseId: row.databaseId, docsDatabaseId: row.docsDatabaseId }, autoSyncDeals: row.autoSyncDeals, autoSyncDocs: row.autoSyncDocs };
    }
  }
  const token = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_LEADS_DATABASE_ID;
  if (!token || !databaseId) return null;
  return { env: { token, databaseId, docsDatabaseId: process.env.NOTION_DOCS_DATABASE_ID ?? null }, autoSyncDeals: false, autoSyncDocs: false };
}

export async function resolveNotionEnv(organizationId: string): Promise<NotionEnv | null> {
  return (await resolveNotionSettings(organizationId))?.env ?? null;
}
