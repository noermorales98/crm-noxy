import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { checkNvidiaKey, deleteProviderKey, describeProviderKeys, saveProviderKey } from "@/src/lib/ai-keys";
import { parseProviderApiKey } from "@/src/lib/ai-provider";
import { canManageTeam } from "@/src/lib/permissions";

/** Mensaje útil (sin datos sensibles) cuando falla la base o el cifrado al guardar o quitar. */
function storageError(error: unknown): NextResponse {
  const code = (error as { code?: string } | null)?.code;
  const message = error instanceof Error ? error.message : "";
  console.error("[ai-keys] fallo al guardar o quitar la clave:", error instanceof Error ? error.name : "error", code ?? "");
  if (code === "P2021" || /does not exist/i.test(message)) {
    return NextResponse.json({ error: "Falta crear la tabla de claves en la base de datos (ejecuta prisma/sql/ai-provider-key.up.sql)." }, { status: 500 });
  }
  if (/AUTH_SECRET/.test(message)) return NextResponse.json({ error: "Falta AUTH_SECRET en el servidor: es la clave con la que se cifran las credenciales." }, { status: 500 });
  return NextResponse.json({ error: "No se pudo guardar la clave. Inténtalo de nuevo." }, { status: 500 });
}

/** Solo NVIDIA se guarda en la base; OpenRouter sigue en variables de entorno. */
const SAVEABLE = ["nvidia"] as const;

async function scope(options: { admin?: boolean } = {}) {
  const session = await auth();
  if (!session?.user?.id || !session.currentOrganizationId) return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) } as const;
  if (options.admin && !canManageTeam(session.role)) {
    return { error: NextResponse.json({ error: "Solo el dueño o un administrador puede cambiar las claves de IA." }, { status: 403 }) } as const;
  }
  return { organizationId: session.currentOrganizationId } as const;
}

/** De dónde sale la clave de cada proveedor (base de datos, variable de entorno o ninguna). Nunca devuelve la clave. */
export async function GET() {
  const access = await scope();
  if ("error" in access) return access.error;
  return NextResponse.json(await describeProviderKeys(access.organizationId));
}

/** Guarda (cifrada) la clave de NVIDIA de la organización. Se comprueba contra NVIDIA antes de guardarla. */
export async function PUT(req: Request) {
  const access = await scope({ admin: true });
  if ("error" in access) return access.error;
  const body = await req.json().catch(() => null);
  const provider = body?.provider;
  if (provider !== "nvidia") return NextResponse.json({ error: "Proveedor no válido." }, { status: 400 });

  const parsed = parseProviderApiKey(provider, body?.apiKey);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const check = await checkNvidiaKey(parsed.key);
  if (check === "invalid") return NextResponse.json({ error: "NVIDIA rechazó la clave. Revisa que la copiaste completa." }, { status: 400 });

  try {
    await saveProviderKey(access.organizationId, provider, parsed.key);
  } catch (error) {
    return storageError(error);
  }
  return NextResponse.json({
    statuses: await describeProviderKeys(access.organizationId),
    warning: check === "unreachable" ? "Se guardó, pero no se pudo comprobar con NVIDIA en este momento." : null,
  });
}

/** Quita la clave guardada en la base (si hay una variable de entorno, se usará esa). */
export async function DELETE(req: Request) {
  const access = await scope({ admin: true });
  if ("error" in access) return access.error;
  const provider = new URL(req.url).searchParams.get("provider");
  if (!(SAVEABLE as readonly string[]).includes(provider ?? "")) return NextResponse.json({ error: "Proveedor no válido." }, { status: 400 });
  try {
    await deleteProviderKey(access.organizationId, "nvidia");
  } catch (error) {
    return storageError(error);
  }
  return NextResponse.json({ statuses: await describeProviderKeys(access.organizationId) });
}
