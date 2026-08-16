import { verifyPayload, type OAuthClient } from "@/src/lib/mcp/oauth";

// Página de consentimiento OAuth. Requiere sesión del CRM (el middleware
// redirige a /login si no hay sesión, y vuelve aquí con callbackUrl).
export default async function OAuthAuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");

  const clientId = get("client_id");
  const redirectUri = get("redirect_uri");
  const state = get("state");
  const codeChallenge = get("code_challenge");
  const responseType = get("response_type");

  const client = clientId ? verifyPayload<OAuthClient>(clientId) : null;
  const errors: string[] = [];
  if (!client || client.type !== "client") errors.push("client_id inválido");
  if (responseType !== "code") errors.push("response_type debe ser 'code'");
  if (!redirectUri) errors.push("redirect_uri es requerido");
  else if (client && !client.redirectUris.includes(redirectUri)) errors.push("redirect_uri no registrado para este cliente");
  if (!codeChallenge) errors.push("code_challenge (PKCE) es requerido");

  if (errors.length > 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 dark:bg-zinc-950">
        <div className="w-full max-w-md rounded-surface border border-border-subtle bg-white p-8 shadow-sm">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Solicitud OAuth inválida</h1>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-red-600 dark:text-red-400">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-surface border border-border-subtle bg-white p-8 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400">CRM Noxy · MCP</p>
        <h1 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Autorizar a {client!.name}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{client!.name}</span> podrá leer y
          modificar los datos de tu CRM (contactos, empresas, deals, tareas, citas, cotizaciones, etc.)
          a través del servidor MCP.
        </p>
        <form method="POST" action="/api/oauth/authorize" className="mt-6">
          <input type="hidden" name="client_id" value={clientId} />
          <input type="hidden" name="redirect_uri" value={redirectUri} />
          <input type="hidden" name="state" value={state} />
          <input type="hidden" name="code_challenge" value={codeChallenge} />
          <button
            type="submit"
            className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Autorizar acceso
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
          Si no confías en esta aplicación, simplemente cierra esta página.
        </p>
      </div>
    </div>
  );
}
