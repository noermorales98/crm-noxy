import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const card = readFileSync(new URL("./ActionCard.tsx", import.meta.url), "utf8");
const prompt = readFileSync(new URL("../../../app/api/assistant/chat/route.ts", import.meta.url), "utf8");

const NEW_ACTIONS = ["create_content_item", "edit_content_item", "set_content_status", "edit_content_client_context", "create_kb_doc", "edit_kb_doc", "create_video", "create_pipeline_category", "record_client_payment", "create_ai_schedule", "create_content_batch"];

test("cada acción nueva del asistente está declarada, se ejecuta y se explica en el prompt de la IA", () => {
  for (const name of NEW_ACTIONS) {
    assert.match(card, new RegExp(`type: "${name}"`), `${name}: falta el tipo`);
    assert.match(card, new RegExp(`case "${name}"`), `${name}: falta su ejecución o su formulario`);
    assert.match(prompt, new RegExp(`- ${name}:`), `${name}: la IA no sabe que existe`);
  }
});

test("las acciones nuevas solo llaman rutas del propio CRM (que ya filtran por organización)", () => {
  const calls = [...card.matchAll(/fetch\(\s*[`"](\/[^`"?]*)/g)].map((m) => m[1]);
  assert.ok(calls.length > 0);
  for (const url of calls) assert.ok(url.startsWith("/api/"), url);
});
