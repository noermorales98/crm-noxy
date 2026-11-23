import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { buildFollowUpMessage, shouldNotifyFollowUp } from "./followup-notify.ts";

const now = new Date("2026-11-23T15:00:00Z");
const deal = (over = {}) => ({ id: "d", title: "Casa Alba", followUpAt: new Date("2026-11-23T10:00:00Z"), followUpNotifiedAt: null, isArchived: false, ...over });

test("avisa un seguimiento vencido hoy que nunca se avisó", () => {
  assert.equal(shouldNotifyFollowUp(deal(), now), true);
});

test("no repite: ya avisado por esta fecha", () => {
  assert.equal(shouldNotifyFollowUp(deal({ followUpNotifiedAt: new Date("2026-11-23T10:15:00Z") }), now), false);
});

test("vuelve a avisar si la fecha de seguimiento es posterior al último aviso", () => {
  assert.equal(shouldNotifyFollowUp(deal({ followUpNotifiedAt: new Date("2026-11-21T10:00:00Z") }), now), true);
});

test("ignora archivados, futuros, sin fecha y vencidos hace más de 24 h", () => {
  assert.equal(shouldNotifyFollowUp(deal({ isArchived: true }), now), false);
  assert.equal(shouldNotifyFollowUp(deal({ followUpAt: new Date("2026-11-23T16:00:00Z") }), now), false);
  assert.equal(shouldNotifyFollowUp(deal({ followUpAt: null }), now), false);
  assert.equal(shouldNotifyFollowUp(deal({ followUpAt: new Date("2026-11-22T10:00:00Z") }), now), false);
});

test("un solo mensaje con tope y «+N más»", () => {
  const many = Array.from({ length: 7 }, (_, i) => ({ title: `Deal ${i + 1}`, contactName: i === 0 ? "Ana" : null }));
  const text = buildFollowUpMessage(many);
  assert.match(text, /7 seguimientos vencidos/);
  assert.match(text, /Deal 1 — Ana/);
  assert.match(text, /\+2 más/);
  assert.doesNotMatch(text, /Deal 6/);
  assert.match(buildFollowUpMessage([many[1]]), /1 seguimiento vencido/);
});
