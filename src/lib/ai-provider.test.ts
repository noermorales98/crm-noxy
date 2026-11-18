import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { CHAT_ENDPOINTS, LIGHT_NVIDIA_MODELS, fallbackCandidates, isNvidiaChatModelId, mergeNvidiaModels, missingKeyMessage, providerHeaders, providerKeys, providerModelName, parseProviderApiKey, providerOfModelId, shouldTryNextKey } from "./ai-provider.ts";

test("el prefijo nvidia: manda el modelo a NVIDIA y se quita antes de enviarlo; lo demás es OpenRouter", () => {
  assert.equal(providerOfModelId("nvidia:deepseek-ai/deepseek-v4.1-flash"), "nvidia");
  assert.equal(providerModelName("nvidia:deepseek-ai/deepseek-v4.1-flash"), "deepseek-ai/deepseek-v4.1-flash");
  assert.equal(providerOfModelId("google/gemma-4-31b-it:free"), "openrouter");
  assert.equal(providerModelName("google/gemma-4-31b-it:free"), "google/gemma-4-31b-it:free");
  assert.equal(providerOfModelId("meta/llama-3.3-70b-instruct"), "openrouter", "un id de NVIDIA sin prefijo no se confunde");
});

test("destinos fijos por proveedor", () => {
  assert.equal(CHAT_ENDPOINTS.nvidia, "https://integrate.api.nvidia.com/v1/chat/completions");
  assert.equal(CHAT_ENDPOINTS.openrouter, "https://openrouter.ai/api/v1/chat/completions");
});

test("claves: OpenRouter usa las dos cuentas en orden; NVIDIA la suya; vacías y con espacios se ignoran", () => {
  assert.deepEqual(providerKeys("openrouter", { OPENROUTER_API_KEY: "a", OPENROUTER_API_KEY_SECONDARY: "b" }), ["a", "b"]);
  assert.deepEqual(providerKeys("openrouter", { OPENROUTER_API_KEY_SECONDARY: " b " }), ["b"]);
  assert.deepEqual(providerKeys("openrouter", { OPENROUTER_API_KEY: "  ", OPENROUTER_API_KEY_SECONDARY: "" }), []);
  assert.deepEqual(providerKeys("nvidia", { NVIDIA_API_KEY: "n", OPENROUTER_API_KEY: "a" }), ["n"]);
  assert.deepEqual(providerKeys("nvidia", {}), []);
});

test("cabeceras: la clave va solo en Authorization; OpenRouter añade su identificación", () => {
  const nv = providerHeaders("nvidia", "KEY");
  assert.equal(nv.Authorization, "Bearer KEY");
  assert.equal(nv["HTTP-Referer"], undefined);
  const or = providerHeaders("openrouter", "KEY");
  assert.equal(or["X-Title"], "CRM Noxy");
  assert.equal(Object.values(or).filter((v) => String(v).includes("KEY")).length, 1);
});

test("mensaje de clave ausente nombra la variable correcta (la usa describeAiError)", () => {
  assert.match(missingKeyMessage("nvidia"), /NVIDIA_API_KEY/);
  assert.match(missingKeyMessage("openrouter"), /OPENROUTER_API_KEY/);
});

test("se salta a la otra clave ante clave mala, sin créditos, límite o fallo del servidor; no ante petición o modelo mal", () => {
  for (const s of [401, 402, 403, 408, 429, 500, 502, 503, 504]) assert.equal(shouldTryNextKey(s), true, String(s));
  for (const s of [200, 400, 404, 413, 422]) assert.equal(shouldTryNextKey(s), false, String(s));
});

test("los modelos de OpenRouter cuyo id empieza por «nvidia/» siguen siendo de OpenRouter", () => {
  assert.equal(providerOfModelId("nvidia/nemotron-3-super-120b-a12b:free"), "openrouter");
  assert.equal(providerModelName("nvidia/nemotron-3-super-120b-a12b:free"), "nvidia/nemotron-3-super-120b-a12b:free");
});

test("clave de NVIDIA: forma válida, recorte de espacios y errores claros", () => {
  assert.deepEqual(parseProviderApiKey("nvidia", "  nvapi-AbCdEfGh1234_-xyz9 "), { ok: true, key: "nvapi-AbCdEfGh1234_-xyz9" });
  assert.equal(parseProviderApiKey("nvidia", "").ok, false);
  assert.equal(parseProviderApiKey("nvidia", undefined).ok, false);
  assert.equal(parseProviderApiKey("nvidia", 42).ok, false);
  assert.equal(parseProviderApiKey("nvidia", "sk-or-v1-abcdefghijklmnop").ok, false, "una clave de OpenRouter no es de NVIDIA");
  assert.equal(parseProviderApiKey("nvidia", "nvapi-corta").ok, false);
  assert.equal(parseProviderApiKey("nvidia", "nvapi-abcdefghij klmnopqrst").ok, false, "con espacios en medio no");
  assert.equal(parseProviderApiKey("nvidia", `nvapi-${"a".repeat(600)}`).ok, false);
});

test("lista de NVIDIA: solo modelos de chat, no embeddings, reordenado, seguridad ni visión", () => {
  assert.equal(isNvidiaChatModelId("nvidia/nemotron-3-ultra-550b-a55b"), true);
  assert.equal(isNvidiaChatModelId("mistralai/mistral-large-4-1t-a52b"), true);
  for (const id of ["nvidia/nv-embed-v1", "nvidia/rerank-qa-mistral-4b", "nvidia/llama-guard-4", "nvidia/nvclip", "meta/llama-3.2-11b-vision-instruct", "sin-barra", "nvidia/ai-synthetic-video-detector", "nvidia/cosmos-reason2-8b", "nvidia/ising-calibration-1.5-31b"]) {
    assert.equal(isNvidiaChatModelId(id), false, id);
  }
});

const cat = (id: string, provider = "nvidia") => ({ id, name: id, group: provider === "nvidia" ? "NVIDIA" : "Otros", provider, configured: true });

test("mezcla con la lista vigente: quita del catálogo los retirados, añade los nuevos y no toca otros proveedores", () => {
  const catalog = [cat("nvidia:deepseek-ai/deepseek-v4.1-flash"), cat("nvidia:mistralai/mistral-large-4-1t-a52b"), cat("google/gemma-4-31b-it:free", "openrouter")];
  const out = mergeNvidiaModels(catalog, ["mistralai/mistral-large-4-1t-a52b", "google/gemma-4-31b-it", "nvidia/nv-embed-v1"]);
  const ids = out.map((m: { id: string }) => m.id);
  assert.ok(!ids.includes("nvidia:deepseek-ai/deepseek-v4.1-flash"), "el retirado desaparece");
  assert.ok(ids.includes("nvidia:mistralai/mistral-large-4-1t-a52b"));
  assert.ok(ids.includes("google/gemma-4-31b-it:free"), "OpenRouter intacto");
  assert.ok(ids.includes("nvidia:google/gemma-4-31b-it"), "el vigente nuevo se añade con prefijo");
  assert.ok(!ids.some((i: string) => i.includes("nv-embed")), "los que no son de chat no entran");
  assert.equal(out.find((m: { id: string }) => m.id === "nvidia:google/gemma-4-31b-it")?.name, "gemma-4-31b-it");
  assert.equal(out.filter((m: { id: string }) => m.id === "nvidia:mistralai/mistral-large-4-1t-a52b").length, 1, "sin duplicados");
});

test("respaldo: solo modelos ligeros de NVIDIA, sin repetir el principal y solo los vigentes", () => {
  assert.deepEqual(fallbackCandidates("google/gemma-4-31b-it:free", null), [...LIGHT_NVIDIA_MODELS]);
  assert.deepEqual(fallbackCandidates("nvidia:nvidia/nemotron-3.5-lightning-30b-a3b", null), ["nvidia:nvidia/nemotron-3.5-bolt-e4b"]);
  assert.deepEqual(fallbackCandidates("x", ["nvidia/nemotron-3.5-bolt-e4b"]), ["nvidia:nvidia/nemotron-3.5-bolt-e4b"], "el retirado no se intenta");
  assert.deepEqual(fallbackCandidates("x", []), [], "sin ninguno vigente, sin respaldo");
  for (const id of LIGHT_NVIDIA_MODELS) assert.ok(!/(ultra|550b|120b|405b|large|super)/i.test(id), `${id} no debe ser un modelo pesado`);
});
