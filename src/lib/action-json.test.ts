import test from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error: node --test carga el .ts directo
import { parseActionJson } from "./action-json.ts";

test("JSON válido se lee tal cual", () => {
  const r = parseActionJson('{"type":"create_task","prefill":{"title":"Llamar"}}');
  assert.deepEqual(r, { type: "create_task", prefill: { title: "Llamar" } });
});

test("saltos de línea reales dentro de un texto (lo que escribe la IA) se reparan", () => {
  const raw = '{"type":"draft_email","prefill":{"subject":"Hola","body":"Hola Ana,\n\nGracias por la reunión.\nSaludos"}}';
  const r = parseActionJson(raw) as { prefill: { body: string } } | null;
  assert.ok(r);
  assert.equal(r.prefill.body, "Hola Ana,\n\nGracias por la reunión.\nSaludos");
});

test("comas sobrantes y comillas tipográficas fuera de textos se toleran", () => {
  const r = parseActionJson('{"type":"create_task","prefill":{"title":"X",},}');
  assert.deepEqual(r, { type: "create_task", prefill: { title: "X" } });
});

test("lo truncado o sin tipo no se acepta (nunca se actúa con datos a medias)", () => {
  assert.equal(parseActionJson('{"type":"draft_email","prefill":{"subject":"Ho'), null);
  assert.equal(parseActionJson('{"prefill":{}}'), null);
  assert.equal(parseActionJson("no es json"), null);
  assert.equal(parseActionJson("[1,2]"), null);
});

test("un texto con llaves dentro no confunde la reparación", () => {
  const r = parseActionJson('{"type":"draft_email","prefill":{"body":"usa {nombre}\ny listo"}}') as { prefill: { body: string } } | null;
  assert.ok(r);
  assert.equal(r.prefill.body, "usa {nombre}\ny listo");
});
