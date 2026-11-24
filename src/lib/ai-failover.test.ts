import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { buildModelChain, classifyStatus, describeSwitch, parseAiPrefs, shouldPromote } from "./ai-failover.ts";

test("classifyStatus: bien, probar otra cuenta, o saltar de modelo", () => {
  assert.equal(classifyStatus(200), "ok");
  for (const s of [401, 402, 403, 408, 429, 500, 503]) assert.equal(classifyStatus(s), "next-key", String(s));
  for (const s of [400, 404, 422]) assert.equal(classifyStatus(s), "next-model", String(s));
});

test("buildModelChain: el pedido primero, sin repetidos y con tope", () => {
  assert.deepEqual(buildModelChain("a", { fallbacks: ["b", "a"], automatic: ["c", "b", "d", "e"] }), ["a", "b", "c", "d"]);
  assert.deepEqual(buildModelChain("a"), ["a"]);
  assert.deepEqual(buildModelChain("a", { automatic: ["b", "c"], max: 2 }), ["a", "b"]);
});

test("shouldPromote: solo si todas las cuentas fallaron por algo persistente y otro modelo respondió", () => {
  assert.equal(shouldPromote([402, 402], "nvidia:x", "openrouter-y"), true);
  assert.equal(shouldPromote([402, 429], "nvidia:x", "openrouter-y"), false, "un límite de ritmo es pasajero");
  assert.equal(shouldPromote([402], "openrouter-y", "openrouter-y"), false, "si respondió el mismo modelo no hay cambio");
  assert.equal(shouldPromote([404], "nvidia:x", "viejo"), true, "un modelo retirado tampoco vuelve solo");
  assert.equal(shouldPromote([], "nvidia:x", "openrouter-y"), false);
});

test("describeSwitch dice qué pasó, con o sin cambio de predeterminado", () => {
  assert.match(describeSwitch("Gemma", "Nemotron", true), /predeterminado/);
  assert.doesNotMatch(describeSwitch("Gemma", "Nemotron", false), /predeterminado/);
});

test("parseAiPrefs tolera basura y por defecto deja el cambio automático encendido", () => {
  assert.deepEqual(parseAiPrefs(null), { defaultModelId: null, autoSwitch: true, fallbackModelIds: [] });
  assert.deepEqual(parseAiPrefs("{roto"), { defaultModelId: null, autoSwitch: true, fallbackModelIds: [] });
  assert.deepEqual(parseAiPrefs(JSON.stringify({ defaultModelId: " nvidia:x ", autoSwitch: false, fallbackModelIds: ["a", 3, "", "b"] })), { defaultModelId: "nvidia:x", autoSwitch: false, fallbackModelIds: ["a", "b"] });
});
