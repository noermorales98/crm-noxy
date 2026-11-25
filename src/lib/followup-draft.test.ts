import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { pickFollowupCompany, parseFollowupJson, shouldDraftFollowup, FOLLOWUP_SYSTEM_PROMPT } from "./followup-draft.ts";

const co = (id: string, name: string, smtp: boolean) => ({ id, name, smtpHost: smtp ? "smtp.x.com" : null });

test("el remitente es Noxy Digital si tiene correo configurado", () => {
  assert.equal(pickFollowupCompany([co("a", "Dreams Club", true), co("b", "Noxy Digital", true)])?.id, "b");
  assert.equal(pickFollowupCompany([co("a", "  noxy   digital ", true)])?.id, "a");
});

test("sin Noxy Digital con correo: la única con correo; si hay varias o ninguna, ninguna", () => {
  assert.equal(pickFollowupCompany([co("a", "Noxy Digital", false), co("b", "Otra", true)])?.id, "b");
  assert.equal(pickFollowupCompany([co("a", "Uno", true), co("b", "Dos", true)]), null);
  assert.equal(pickFollowupCompany([co("a", "Uno", false)]), null);
  assert.equal(pickFollowupCompany([]), null);
});

test("parseFollowupJson lee JSON limpio, con texto alrededor o en bloque de código", () => {
  assert.deepEqual(parseFollowupJson('{"subject":"Hola","body":"Texto"}'), { subject: "Hola", body: "Texto" });
  assert.deepEqual(parseFollowupJson('Claro:\n```json\n{"subject":"S","body":"B\\nC"}\n```'), { subject: "S", body: "B\nC" });
});

test("parseFollowupJson rechaza lo que no sirve", () => {
  assert.equal(parseFollowupJson("no hay json"), null);
  assert.equal(parseFollowupJson('{"subject":"S"}'), null);
  assert.equal(parseFollowupJson('{"subject":"S","body":"   "}'), null);
  assert.equal(parseFollowupJson('{"subject":5,"body":"x"}'), null);
});

test("shouldDraftFollowup: solo con notas con texto, persona conocida, sin borrador previo y cita no cancelada", () => {
  const ok = { status: "COMPLETED", followupDraftedAt: null, notesText: "Se acordó X", hasPerson: true };
  assert.equal(shouldDraftFollowup(ok), true);
  assert.equal(shouldDraftFollowup({ ...ok, followupDraftedAt: new Date() }), false);
  assert.equal(shouldDraftFollowup({ ...ok, status: "CANCELLED" }), false);
  assert.equal(shouldDraftFollowup({ ...ok, notesText: "   " }), false);
  assert.equal(shouldDraftFollowup({ ...ok, hasPerson: false }), false);
});

test("el prompt prohíbe inventar datos y pide JSON", () => {
  assert.match(FOLLOWUP_SYSTEM_PROMPT, /JSON/);
  assert.match(FOLLOWUP_SYSTEM_PROMPT, /no inventes/i);
});
