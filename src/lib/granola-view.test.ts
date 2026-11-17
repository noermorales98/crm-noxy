import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { NOT_CONNECTED, parseGranolaApiKey, viewOfConfig } from "./granola-view.ts";

test("sin configuración → no conectado", () => {
  assert.deepEqual(viewOfConfig(null), NOT_CONNECTED);
});

test("la vista no contiene ningún campo secreto aunque la fila los traiga", () => {
  const row = { mode: "MCP", status: "CONNECTED", lastSyncAt: new Date("2026-11-06T10:00:00Z"), lastSyncCount: 3, lastSyncError: null, apiKey: "v1:x", mcpTokens: "v1:y", mcpClientInfo: "v1:z" };
  const view = viewOfConfig(row);
  assert.deepEqual(Object.keys(view).sort(), ["connected", "lastSyncAt", "lastSyncCount", "lastSyncError", "mode", "status"]);
  assert.equal(view.connected, true);
  assert.equal(view.mode, "MCP");
  assert.equal(view.lastSyncAt, "2026-11-06T10:00:00.000Z");
});

test("estados que no son CONNECTED no cuentan como conectado", () => {
  for (const status of ["PENDING", "NEEDS_RECONNECT", "ERROR"]) {
    assert.equal(viewOfConfig({ mode: "API_KEY", status, lastSyncAt: null, lastSyncCount: 0, lastSyncError: null }).connected, false);
  }
});

test("clave API: forma válida, recorte de espacios y errores claros", () => {
  assert.deepEqual(parseGranolaApiKey("  grn_ABCDEFGH1234 "), { ok: true, key: "grn_ABCDEFGH1234" });
  assert.equal(parseGranolaApiKey("").ok, false);
  assert.equal(parseGranolaApiKey(undefined).ok, false);
  assert.equal(parseGranolaApiKey("sk-123456789").ok, false);
  assert.equal(parseGranolaApiKey("grn_corta").ok, false);
});
