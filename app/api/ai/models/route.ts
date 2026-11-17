import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAvailableAiModels } from "@/src/lib/ai-completion";
import { describeProviderKeys } from "@/src/lib/ai-keys";
import { providerOfModelId } from "@/src/lib/ai-provider";

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
  return NextResponse.json(
    models.map((m) => {
      const provider = providerOfModelId(m.id);
      return { id: m.id, name: m.name, group: m.group, provider, configured: configuredByProvider[provider] };
    }),
  );
}
