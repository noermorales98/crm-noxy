import { createHash, randomBytes } from "node:crypto";

// Clave propia del agente externo (OpenClaw/Kimi Claw): se guarda solo su hash, se puede revocar sin redeploy y solo abre
// una lista corta de herramientas. Nada que envíe, borre, cobre o administre.

export const AGENT_KEY_PREFIX = "nxa_";

export function hashAgentKey(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function isAgentToken(token: string): boolean {
  return token.startsWith(AGENT_KEY_PREFIX);
}

/** La clave se muestra una sola vez; en base de datos queda el hash y los primeros caracteres para reconocerla. */
export function generateAgentKey(): { token: string; hash: string; prefix: string } {
  const token = AGENT_KEY_PREFIX + randomBytes(32).toString("base64url");
  return { token, hash: hashAgentKey(token), prefix: token.slice(0, 10) };
}

/** Lectura de lo necesario para trabajar + creación de lo interno y reversible (tareas, leads, contactos, notas, borradores). */
export const AGENT_TOOL_ALLOWLIST = [
  "get_daily_summary", "search_crm", "search_kb",
  "list_contacts", "get_contact", "list_companies", "get_company",
  "list_deals", "get_deal", "list_deal_activities", "list_pipelines",
  "list_tasks", "get_task", "list_appointments", "get_appointment", "list_appointment_types",
  "list_kb_pages", "get_kb_page", "list_emails",
  "create_task", "update_task", "create_lead", "create_contact", "add_deal_activity", "create_kb_page", "create_email_draft",
] as const;

const ALLOWED = new Set<string>(AGENT_TOOL_ALLOWLIST);
export const isAgentToolAllowed = (name: string): boolean => ALLOWED.has(name);

export type AgentLogEntry = { tool: string; ok: boolean; error?: string };

// Un fallo al escribir el registro nunca debe romper la herramienta.
async function safeLog(log: (e: AgentLogEntry) => void | Promise<void>, entry: AgentLogEntry) {
  try { await log(entry); } catch { /* el registro es secundario */ }
}

/**
 * Envuelve el servidor MCP: las herramientas fuera de la lista no se registran (para el agente no existen) y las permitidas
 * dejan un registro (nombre, éxito, mensaje de error corto; nunca los argumentos, que pueden llevar datos de personas).
 */
export function guardServer<S extends object>(server: S, opts: { allowed: (name: string) => boolean; log: (e: AgentLogEntry) => void | Promise<void> }): S {
  return new Proxy(server, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (prop !== "registerTool") return typeof value === "function" ? value.bind(target) : value;
      return (name: string, config: unknown, cb: (...a: unknown[]) => Promise<unknown>) => {
        if (!opts.allowed(name)) return undefined;
        const wrapped = async (...args: unknown[]) => {
          try {
            const res = (await cb(...args)) as { isError?: boolean; content?: { text?: string }[] } | undefined;
            if (res?.isError) await safeLog(opts.log, { tool: name, ok: false, error: (res.content?.[0]?.text ?? "error").slice(0, 200) });
            else await safeLog(opts.log, { tool: name, ok: true });
            return res;
          } catch (e) {
            await safeLog(opts.log, { tool: name, ok: false, error: (e instanceof Error ? e.message : String(e)).slice(0, 200) });
            throw e;
          }
        };
        return (value as (n: string, c: unknown, f: unknown) => unknown).call(target, name, config, wrapped);
      };
    },
  }) as S;
}
