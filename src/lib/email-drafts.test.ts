import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { textToHtml, normalizeDraft, draftReadyToSend } from "./email-drafts.ts";

test("textToHtml escapa HTML y separa párrafos y saltos", () => {
  assert.equal(textToHtml("Hola <b>\n\nLínea 1\nLínea 2"), "<p>Hola &lt;b&gt;</p><p>Línea 1<br>Línea 2</p>");
  assert.equal(textToHtml(""), "");
});

test("normalizeDraft: el destinatario es opcional y el asunto tiene valor por defecto", () => {
  const r = normalizeDraft({ body: "Hola" });
  assert.equal(r.ok, true);
  assert.equal(r.data.toAddress, "");
  assert.equal(r.data.subject, "(sin asunto)");
  assert.equal(r.data.bodyHtml, "<p>Hola</p>");
  assert.equal(r.data.bodyText, "Hola");
});

test("normalizeDraft: bodyHtml explícito se respeta y genera el texto plano", () => {
  const r = normalizeDraft({ to: " a@b.com ", subject: " Hola ", bodyHtml: "<p>Uno</p><p>Dos</p>" });
  assert.equal(r.data.toAddress, "a@b.com");
  assert.equal(r.data.subject, "Hola");
  assert.equal(r.data.bodyHtml, "<p>Uno</p><p>Dos</p>");
  assert.equal(r.data.bodyText, "Uno\n\nDos");
});

test("normalizeDraft rechaza tipos inválidos y cuerpos enormes", () => {
  assert.equal(normalizeDraft({ to: 5 }).ok, false);
  assert.equal(normalizeDraft({ body: "x".repeat(300_001) }).ok, false);
  assert.equal(normalizeDraft(null).ok, false);
});

test("draftReadyToSend exige destinatario válido, asunto real y cuerpo", () => {
  assert.equal(draftReadyToSend({ toAddress: "a@b.com", subject: "Hola", bodyHtml: "<p>x</p>" }).ready, true);
  assert.equal(draftReadyToSend({ toAddress: "", subject: "Hola", bodyHtml: "<p>x</p>" }).ready, false);
  assert.equal(draftReadyToSend({ toAddress: "no-es-correo", subject: "Hola", bodyHtml: "<p>x</p>" }).ready, false);
  assert.equal(draftReadyToSend({ toAddress: "a@b.com", subject: "(sin asunto)", bodyHtml: "<p>x</p>" }).ready, false);
  assert.equal(draftReadyToSend({ toAddress: "a@b.com", subject: "Hola", bodyHtml: "" }).ready, false);
});
