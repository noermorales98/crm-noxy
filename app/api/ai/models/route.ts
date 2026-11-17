import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAvailableAiModels } from "@/src/lib/ai-completion";
import { describeProviderKeys, listNvidiaModelIds } from "@/src/lib/ai-keys";
import { mergeNvidiaModels, providerOfModelId } from "@/src/lib/ai-provider";

/**
 * Modelos de IA disponibles para la organización (los de fábrica no ocultos y los personalizados), para elegir uno.
 * `configured` dice si el servidor tiene alguna clave del proveedor del modelo; nunca se devuelve ninguna clave.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user || !session.currentOrganizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.currentOrganizationId;
  const statuses = await describeProviderKeys(orgId);
  const configuredByProvider = { openrouter: statuses.find((s) => s.provider === "openrouter")?.source !== "none", nvidia: statuses.find((s) => s.provider === "nvidia")?.source !== "none" };
  const models = await getAvailableAiModels(orgId);
  const catalog = models.map((m) => {
    const provider = providerOfModelId(m.id);
    return { id: m.id, name: m.name, group: m.group, provider, configured: configuredByProvider[provider] };
  });
  // Con clave de NVIDIA se consulta su lista vigente: los modelos retirados desaparecen y los nuevos aparecen solos.
  const live = await listNvidiaModelIds(orgId);
  return NextResponse.json(live ? mergeNvidiaModels(catalog, live) : catalog);
}
