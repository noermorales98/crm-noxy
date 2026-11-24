import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { classifyModel, modelSizeB, tierLabel } from "./ai-model-info.ts";

test("modelSizeB lee el tamaño del nombre y no confunde los parámetros activos de un MoE", () => {
  assert.equal(modelSizeB("llama-3.3-70b-instruct"), 70);
  assert.equal(modelSizeB("mistral-large-4-1t-a52b"), 1000);
  assert.equal(modelSizeB("nemotron-3.5-lightning-30b-a3b"), 30);
  assert.equal(modelSizeB("gemma-4-26b-a4b-it"), 26);
  assert.equal(modelSizeB("gpt-4o"), null);
});

test("los grandes son potentes y los pequeños o «lightning» son ligeros", () => {
  assert.equal(classifyModel("meta-llama/llama-3.3-70b-instruct:free", "Llama 3.3 70B").tier, "powerful");
  assert.equal(classifyModel("openai/gpt-oss-120b:free", "GPT OSS 120B").tier, "powerful");
  assert.equal(classifyModel("nvidia:mistralai/mistral-large-4-1t-a52b", "Mistral Large 4").tier, "powerful");
  assert.equal(classifyModel("meta-llama/llama-3.2-3b-instruct:free", "Llama 3.2 3B").tier, "light");
  assert.equal(classifyModel("nvidia:nvidia/nemotron-3.5-bolt-e4b", "Nemotron 3.5 Bolt 4B").tier, "light");
  assert.equal(classifyModel("nvidia:nvidia/nemotron-3.5-lightning-30b-a3b", "Nemotron 3.5 Lightning 30B").tier, "light");
});

test("un tamaño medio es equilibrado", () => {
  assert.equal(classifyModel("google/gemma-4-31b-it:free", "Gemma 4 31B").tier, "balanced");
});

test("detecta código, razonamiento y visión, y los pone en las etiquetas tras el nivel", () => {
  const coder = classifyModel("nvidia:qwen/qwen2.5-coder-32b-instruct", "Qwen2.5 Coder 32B");
  assert.deepEqual(coder.tags.slice(0, 2), [tierLabel(coder.tier), "Código"]);
  assert.ok(classifyModel("deepseek-ai/deepseek-r1", "DeepSeek R1").tags.includes("Razonamiento"));
  assert.ok(classifyModel("meta/llama-3.2-11b-vision-instruct", "Llama 3.2 11B Vision").tags.includes("Visión"));
});

test("la descripción dice para qué sirve y cuántos parámetros tiene", () => {
  const info = classifyModel("meta-llama/llama-3.3-70b-instruct:free", "Llama 3.3 70B");
  assert.match(info.description, /70 B de parámetros/);
  assert.match(classifyModel("nvidia:nvidia/nemotron-3.5-bolt-e4b", "Bolt").description, /rápido/i);
  assert.match(classifyModel("deepseek-ai/deepseek-r1", "R1").description, /paso a paso/);
});
