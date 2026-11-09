import { AsyncLocalStorage } from "node:async_hooks";

type McpContext = { client: string; origin: string };

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
