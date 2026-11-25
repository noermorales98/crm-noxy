import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { AUTO_RUN_TYPES, isSensitiveAction, isAutoRunnable } from "./action-safety.ts";

test("lo interno y reversible corre solo: borrador y tarea", () => {
  assert.deepEqual([...AUTO_RUN_TYPES].sort(), ["create_task", "draft_email"]);
  assert.equal(isAutoRunnable({ type: "draft_email", prefill: { body: "Hola" } }), true);
  assert.equal(isAutoRunnable({ type: "create_task", prefill: { title: "Dar seguimiento" } }), true);
});

test("sin lo mínimo no corre solo (queda la tarjeta para completar)", () => {
  assert.equal(isAutoRunnable({ type: "draft_email", prefill: { body: "  " } }), false);
  assert.equal(isAutoRunnable({ type: "draft_email" }), false);
  assert.equal(isAutoRunnable({ type: "create_task", prefill: {} }), false);
});

test("AC7: enviar, borrar y cambiar a perdida son sensibles y nunca corren solos", () => {
  for (const type of ["send_email", "send_quote", "send_draft", "delete_deal", "delete_contact", "delete_task", "delete_quote", "delete_company"]) {
    assert.equal(isSensitiveAction({ type }), true, type);
    assert.equal(isAutoRunnable({ type, prefill: { body: "x", title: "x" } }), false, type);
  }
  assert.equal(isSensitiveAction({ type: "edit_deal", prefill: { lostReason: "Sin presupuesto" } }), true);
  assert.equal(isSensitiveAction({ type: "edit_deal", prefill: { stageIsLost: "true" } }), true);
  assert.equal(isAutoRunnable({ type: "edit_deal", prefill: { title: "x" } }), false);
});

test("las acciones internas no son sensibles", () => {
  assert.equal(isSensitiveAction({ type: "draft_email" }), false);
  assert.equal(isSensitiveAction({ type: "create_task" }), false);
  assert.equal(isSensitiveAction({ type: "edit_deal", prefill: { title: "x" } }), false);
});
