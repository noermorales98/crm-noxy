import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { parseBulkReminderInput } from "./content-reminder-input.ts";

test("acepta «all» y listas de clientes, sin duplicados", () => {
  assert.deepEqual(parseBulkReminderInput({ clientIds: "all", enabled: true }), { ok: true, value: { clientIds: "all", enabled: true } });
  const list = parseBulkReminderInput({ clientIds: ["a", "b", "a"], enabled: false });
  assert.equal(list.ok, true);
  assert.deepEqual(list.value.clientIds, ["a", "b"]);
});

test("rechaza cuerpos inválidos: sin enabled, sin clientes, lista vacía o con basura", () => {
  assert.equal(parseBulkReminderInput(null).ok, false);
  assert.equal(parseBulkReminderInput({ clientIds: "all" }).ok, false, "enabled obligatorio");
  assert.equal(parseBulkReminderInput({ enabled: true }).ok, false);
  assert.equal(parseBulkReminderInput({ clientIds: [], enabled: true }).ok, false);
  assert.equal(parseBulkReminderInput({ clientIds: [1], enabled: true }).ok, false);
  assert.equal(parseBulkReminderInput({ clientIds: "todos", enabled: true }).ok, false);
});

test("valida hora, minuto y días de anticipación", () => {
  assert.equal(parseBulkReminderInput({ clientIds: "all", enabled: true, hour: 24 }).ok, false);
  assert.equal(parseBulkReminderInput({ clientIds: "all", enabled: true, minute: 60 }).ok, false);
  assert.equal(parseBulkReminderInput({ clientIds: "all", enabled: true, hour: 8.5 }).ok, false);
  const ok = parseBulkReminderInput({ clientIds: "all", enabled: true, hour: 9, minute: 30, daysBefore: 99 });
  assert.equal(ok.ok, true);
  assert.deepEqual([ok.value.hour, ok.value.minute, ok.value.daysBefore], [9, 30, 30], "daysBefore se limita a 30");
});
