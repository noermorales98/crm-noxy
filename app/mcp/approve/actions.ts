"use server";

import { auth } from "@/auth";
import { confirmPreview } from "@/src/lib/mcp/approval";

/** Solo una persona con sesión en el CRM puede confirmar: el enlace por sí solo no basta. */
export async function confirmPreviewAction(token: string) {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Inicia sesión en el CRM para confirmar." };
  return confirmPreview(token);
}
