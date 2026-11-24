import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAvailableAiModels } from "@/src/lib/ai-completion";
import { describeProviderKeys, listNvidiaModelIds } from "@/src/lib/ai-keys";
import { mergeNvidiaModels, providerOfModelId } from "@/src/lib/ai-provider";
import { classifyModel, TIER_ORDER } from "@/src/lib/ai-model-info";

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
  const merged = live ? mergeNvidiaModels(catalog, live) : catalog;
  // Cada modelo con su nivel (potente, equilibrado o ligero), etiquetas y una descripción deducidas de su nombre; dentro de cada grupo, los potentes primero.
  const withInfo = merged.map((m) => ({ ...m, ...classifyModel(m.id, m.name) }));
  const groupOrder = [...new Set(withInfo.map((m) => m.group))];
  return NextResponse.json(withInfo.sort((a, b) => groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group) || TIER_ORDER[a.tier] - TIER_ORDER[b.tier]));
}
