import { AsyncLocalStorage } from "node:async_hooks";

type McpContext = { client: string; origin: string; organizationId?: string; agent?: { keyId: string; organizationId: string } };

const storage = new AsyncLocalStorage<McpContext>();

export function runWithMcpContext<T>(ctx: McpContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export function currentMcpClient(): string {
  return storage.getStore()?.client ?? "api-key";
}

export function currentMcpOrigin(): string {
  return storage.getStore()?.origin ?? "https://noxthy.co";
}

/** Organización elegida para esta conexión (`?org=`); `undefined` = la base (MCP_ORGANIZATION_ID). */
export function currentMcpOrganization(): string | undefined {
  return storage.getStore()?.organizationId;
}

/** Si la conexión es de una clave de agente: su id y su organización. `undefined` = conexión normal (OAuth o clave del dueño). */
export function currentMcpAgent(): { keyId: string; organizationId: string } | undefined {
  return storage.getStore()?.agent;
}
