import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { addProviderAccount, checkNvidiaKey, checkOpenRouterKey, describeAccounts, getAiPrefs, removeProviderAccount, updateProviderAccount } from "@/src/lib/ai-keys";
import { parseProviderApiKey, type ChatProvider } from "@/src/lib/ai-provider";
import { canManageTeam } from "@/src/lib/permissions";

// Cuentas (claves) de IA de la organización: varias por proveedor, guardadas cifradas. Nunca se devuelve una clave completa.

const PROVIDERS = ["nvidia", "openrouter"] as const;
const isProvider = (v: unknown): v is ChatProvider => (PROVIDERS as readonly unknown[]).includes(v);

function storageError(error: unknown): NextResponse {
  const code = (error as { code?: string } | null)?.code;
  const message = error instanceof Error ? error.message : "";
  console.error("[ai-accounts]", error instanceof Error ? error.name : "error", code ?? "");
  if (code === "P2021" || /does not exist/i.test(message)) return NextResponse.json({ error: "Falta crear la tabla de claves en la base de datos (prisma/sql/ai-provider-key.up.sql)." }, { status: 500 });
  if (/AUTH_SECRET/.test(message)) return NextResponse.json({ error: "Falta AUTH_SECRET en el servidor: es la clave con la que se cifran las credenciales." }, { status: 500 });
  return NextResponse.json({ error: "No se pudo guardar. Inténtalo de nuevo." }, { status: 500 });
}

async function scope(admin = false) {
  const session = await auth();
  if (!session?.user?.id || !session.currentOrganizationId) return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) } as const;
  if (admin && !canManageTeam(session.role)) return { error: NextResponse.json({ error: "Solo el dueño o un administrador puede cambiar las cuentas de IA." }, { status: 403 }) } as const;
  return { organizationId: session.currentOrganizationId } as const;
}

async function snapshot(organizationId: string) {
  const [providers, prefs] = await Promise.all([describeAccounts(organizationId), getAiPrefs(organizationId)]);
  return { providers, prefs };
}

export async function GET() {
  const access = await scope();
  if ("error" in access) return access.error;
  return NextResponse.json(await snapshot(access.organizationId));
}

/** Agrega una cuenta. Se comprueba contra el proveedor antes de guardarla (una clave rechazada no se guarda). */
export async function POST(req: Request) {
  const access = await scope(true);
  if ("error" in access) return access.error;
  const body = await req.json().catch(() => null);
  if (!isProvider(body?.provider)) return NextResponse.json({ error: "Proveedor no válido." }, { status: 400 });
  const provider = body.provider;
  const parsed = parseProviderApiKey(provider, body?.apiKey);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const check = provider === "nvidia" ? await checkNvidiaKey(parsed.key) : await checkOpenRouterKey(parsed.key);
  if (check === "invalid") return NextResponse.json({ error: `${provider === "nvidia" ? "NVIDIA" : "OpenRouter"} rechazó la clave. Revisa que la copiaste completa.` }, { status: 400 });

  try {
    const added = await addProviderAccount(access.organizationId, provider, { label: typeof body?.label === "string" ? body.label : undefined, key: parsed.key });
    if (!added.ok) return NextResponse.json({ error: added.error }, { status: 400 });
  } catch (error) {
    return storageError(error);
  }
  return NextResponse.json({ ...(await snapshot(access.organizationId)), warning: check === "unreachable" ? "Se guardó, pero no se pudo comprobar con el proveedor en este momento." : null });
}

/** Enciende o apaga una cuenta, la renombra o la sube/baja en el orden de uso. */
export async function PATCH(req: Request) {
  const access = await scope(true);
  if ("error" in access) return access.error;
  const body = await req.json().catch(() => null);
  if (!isProvider(body?.provider) || typeof body?.id !== "string") return NextResponse.json({ error: "Datos no válidos." }, { status: 400 });
  const move = body.move === "up" || body.move === "down" ? body.move : undefined;
  try {
    const found = await updateProviderAccount(access.organizationId, body.provider, body.id, {
      enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
      label: typeof body.label === "string" ? body.label : undefined,
      move,
    });
    if (!found) return NextResponse.json({ error: "Cuenta no encontrada (las del servidor no se editan aquí)." }, { status: 404 });
  } catch (error) {
    return storageError(error);
  }
  return NextResponse.json(await snapshot(access.organizationId));
}

export async function DELETE(req: Request) {
  const access = await scope(true);
  if ("error" in access) return access.error;
  const url = new URL(req.url);
  const provider = url.searchParams.get("provider");
  const id = url.searchParams.get("id");
  if (!isProvider(provider) || !id) return NextResponse.json({ error: "Datos no válidos." }, { status: 400 });
  try {
    await removeProviderAccount(access.organizationId, provider, id);
  } catch (error) {
    return storageError(error);
  }
  return NextResponse.json(await snapshot(access.organizationId));
}
