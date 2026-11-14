import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { dealTitleForLead, normalizeLeadSource, pickLeadStage, resolveLeadSource } from "./form-lead.ts";

test("normalizeLeadSource reconoce alias y manda lo raro a OTRO", () => {
  assert.equal(normalizeLeadSource("Instagram"), "INSTAGRAM");
  assert.equal(normalizeLeadSource("ig"), "INSTAGRAM");
  assert.equal(normalizeLeadSource("TikTok"), "TIKTOK");
  assert.equal(normalizeLeadSource("fb"), "FACEBOOK");
  assert.equal(normalizeLeadSource("WhatsApp"), "WHATSAPP");
  assert.equal(normalizeLeadSource("referido"), "REFERIDO");
  assert.equal(normalizeLeadSource("web"), "FORMULARIO");
  assert.equal(normalizeLeadSource("radio"), "OTRO");
  assert.equal(normalizeLeadSource("  "), null);
  assert.equal(normalizeLeadSource(undefined), null);
});

test("resolveLeadSource: explícito gana, luego campo de referido, luego web", () => {
  const referido = [{ label: "¿Quién te recomendó?", value: "Ana López" }];
  assert.deepEqual(resolveLeadSource({ explicit: "tiktok", fields: referido }), { source: "TIKTOK", referredByText: "Ana López" });
  assert.deepEqual(resolveLeadSource({ fields: referido }), { source: "REFERIDO", referredByText: "Ana López" });
  assert.deepEqual(resolveLeadSource({ fields: [{ label: "Referido por", value: "  " }] }), { source: "FORMULARIO", referredByText: null });
  assert.deepEqual(resolveLeadSource({ fields: [] }), { source: "FORMULARIO", referredByText: null });
});

const stage = (id: string, name: string, order: number, flags: { isWon?: boolean; isLost?: boolean } = {}) =>
  ({ id, name, order, isWon: false, isLost: false, ...flags });

test("pickLeadStage usa la etapa Lead del pipeline más antiguo", () => {
  const old = { id: "p1", createdAt: new Date("2025-01-01"), stages: [stage("s2", "Contactado", 2), stage("s1", "Lead", 1), stage("s9", "Ganado", 9, { isWon: true })] };
  const editorial = { id: "p2", createdAt: new Date("2026-01-01"), stages: [stage("e1", "Entrevista", 1)] };
  assert.deepEqual(pickLeadStage([editorial, old]), { pipelineId: "p1", stageId: "s1" });
});

test("pickLeadStage cae a la primera etapa abierta y devuelve null sin etapas", () => {
  const p = { id: "p1", createdAt: new Date("2025-01-01"), stages: [stage("s3", "Nuevo", 1), stage("s4", "Perdido", 2, { isLost: true })] };
  assert.deepEqual(pickLeadStage([p]), { pipelineId: "p1", stageId: "s3" });
  assert.equal(pickLeadStage([]), null);
});

test("dealTitleForLead combina nombre y formulario", () => {
  assert.equal(dealTitleForLead({ fullName: "Ana López", formName: "Agenda tu demo" }), "Ana López · Agenda tu demo");
});
