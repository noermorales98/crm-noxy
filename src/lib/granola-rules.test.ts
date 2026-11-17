import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { buildTaskData, isEditableNote } from "./granola-rules.ts";

test("solo MANUAL y NOTION se editan; GRANOLA y cualquier otra cosa no", () => {
  assert.equal(isEditableNote("MANUAL"), true);
  assert.equal(isEditableNote("NOTION"), true);
  assert.equal(isEditableNote("GRANOLA"), false);
  assert.equal(isEditableNote(""), false);
});

test("la tarea hereda contacto y lead de la cita y cita su reunión", () => {
  const data = buildTaskData({ text: "  Enviar propuesta " }, { title: "Demo Acme", url: "https://notes.granola.ai/d/x", appointment: { contactId: "c1", dealId: "d1" } });
  assert.equal(data.title, "Enviar propuesta");
  assert.equal(data.contactId, "c1");
  assert.equal(data.dealId, "d1");
  assert.match(data.description, /Demo Acme/);
  assert.match(data.description, /https:\/\/notes\.granola\.ai\/d\/x/);
});

test("sin cita no hay lead ni contacto; título largo se recorta; sin título de reunión se dice", () => {
  const data = buildTaskData({ text: "x".repeat(400) }, { title: null, url: null, appointment: null });
  assert.equal(data.title.length, 190);
  assert.equal(data.contactId, null);
  assert.equal(data.dealId, null);
  assert.match(data.description, /sin título/);
  assert.ok(!data.description.includes("\n"));
});
