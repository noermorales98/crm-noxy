import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { checkMcpCallback } from "./granola-oauth.ts";

const base = { storedState: "abc123", state: "abc123", code: "c0de", error: null };

test("callback: state igual y con código → ok", () => {
  assert.equal(checkMcpCallback(base), "ok");
});

test("callback: state ajeno, vacío o sin guardado → inválido (no se toca nada)", () => {
  assert.equal(checkMcpCallback({ ...base, state: "otro" }), "invalid");
  assert.equal(checkMcpCallback({ ...base, state: null }), "invalid");
  assert.equal(checkMcpCallback({ ...base, state: "" }), "invalid");
  assert.equal(checkMcpCallback({ ...base, storedState: null, state: "" }), "invalid");
  assert.equal(checkMcpCallback({ ...base, storedState: "", state: "" }), "invalid");
  assert.equal(checkMcpCallback({ ...base, storedState: "abc12" }), "invalid");
});

test("callback: state correcto pero cancelada o sin código → denegada (se limpia lo pendiente)", () => {
  assert.equal(checkMcpCallback({ ...base, error: "access_denied" }), "denied");
  assert.equal(checkMcpCallback({ ...base, code: null }), "denied");
});

test("callback: un error con state ajeno sigue siendo inválido, no limpia nada", () => {
  assert.equal(checkMcpCallback({ ...base, state: "otro", error: "access_denied" }), "invalid");
});
