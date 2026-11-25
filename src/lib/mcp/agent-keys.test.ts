import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { AGENT_TOOL_ALLOWLIST, generateAgentKey, hashAgentKey, isAgentToken, isAgentToolAllowed, guardServer } from "./agent-keys.ts";

const dir = new URL(".", import.meta.url);
const source = readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts")).map((f) => readFileSync(new URL(f, dir), "utf8")).join("\n");
const registered = new Set([...source.matchAll(/registerTool\(\s*"([a-z_]+)"/g)].map((m) => m[1]));

test("la clave generada tiene prefijo, es larga, única y su hash no es la clave", () => {
  const a = generateAgentKey(), b = generateAgentKey();
  assert.ok(a.token.startsWith("nxa_") && a.token.length >= 40);
  assert.notEqual(a.token, b.token);
  assert.equal(a.hash, hashAgentKey(a.token));
  assert.ok(!a.hash.includes(a.token));
  assert.equal(a.hash.length, 64);
  assert.ok(a.token.startsWith(a.prefix));
  assert.equal(isAgentToken(a.token), true);
  assert.equal(isAgentToken("sk-otra-cosa"), false);
});

test("AC0a: la lista permitida existe de verdad en el MCP y no contiene nada que envíe, borre, cobre o administre", () => {
  for (const name of AGENT_TOOL_ALLOWLIST) assert.ok(registered.has(name), `${name} no existe en el MCP`);
  for (const name of AGENT_TOOL_ALLOWLIST) assert.doesNotMatch(name, /^(delete_|send_|archive_|mark_payment|create_organization|update_organization|create_quote|update_quote|save_ai_skill|notion_|sync_)/, name);
  assert.equal(isAgentToolAllowed("create_task"), true);
  assert.equal(isAgentToolAllowed("create_email_draft"), true);
  assert.equal(isAgentToolAllowed("delete_contact"), false);
  assert.equal(isAgentToolAllowed("mark_payment_received"), false);
  assert.equal(isAgentToolAllowed("no_existe"), false);
});

function fakeServer() {
  const reg: Record<string, (...a: unknown[]) => Promise<unknown>> = {};
  return { reg, server: { registerTool: (name: string, _c: unknown, cb: (...a: unknown[]) => Promise<unknown>) => { reg[name] = cb; return { name }; }, registerPrompt: () => "p" } };
}

test("guardServer: una herramienta fuera de la lista no se registra; una permitida sí y deja registro", async () => {
  const { reg, server } = fakeServer();
  const log: { tool: string; ok: boolean; error?: string }[] = [];
  const g = guardServer(server, { allowed: isAgentToolAllowed, log: (e: { tool: string; ok: boolean; error?: string }) => log.push(e) });
  g.registerTool("delete_contact", {}, async () => ({ ok: true }));
  g.registerTool("create_task", {}, async () => ({ content: [] }));
  assert.equal("delete_contact" in reg, false);
  assert.equal(typeof reg.create_task, "function");
  await reg.create_task({ title: "x" });
  assert.deepEqual(log, [{ tool: "create_task", ok: true }]);
  assert.equal(g.registerPrompt(), "p"); // lo demás pasa sin tocar
});

test("guardServer registra los errores y los resultados con isError, sin guardar argumentos", async () => {
  const { reg, server } = fakeServer();
  const log: { tool: string; ok: boolean; error?: string }[] = [];
  const g = guardServer(server, { allowed: () => true, log: (e: { tool: string; ok: boolean; error?: string }) => log.push(e) });
  g.registerTool("a", {}, async () => ({ isError: true, content: [{ type: "text", text: "Contacto inválido" }] }));
  g.registerTool("b", {}, async () => { throw new Error("boom"); });
  await reg.a({ secreto: "123" });
  await assert.rejects(() => reg.b({}), /boom/);
  assert.deepEqual(log, [{ tool: "a", ok: false, error: "Contacto inválido" }, { tool: "b", ok: false, error: "boom" }]);
  assert.ok(!JSON.stringify(log).includes("123"));
});
