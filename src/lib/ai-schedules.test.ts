import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { alertMessage, isScheduleDue, lateContentLines, normalizeSchedule, overduePaymentLines, parseSchedules, staleDealLines } from "./ai-schedules.ts";

const NOW = new Date("2026-11-23T14:05:00Z"); // lunes
const d = (iso: string) => new Date(iso);

test("normalizeSchedule exige qué pedirle a la IA y acota los valores", () => {
  assert.equal(normalizeSchedule({ kind: "prompt", prompt: "  " }, "u", "1").ok, false);
  const ok = normalizeSchedule({ kind: "prompt", prompt: "Resumen", hour: 99, weeklyDay: -3, monthlyDay: 40, frequency: "weekly" }, "u", "1");
  assert.ok(ok.ok);
  if (ok.ok) {
    assert.equal(ok.schedule.hour, 23);
    assert.equal(ok.schedule.weeklyDay, 0);
    assert.equal(ok.schedule.monthlyDay, 28);
    assert.equal(ok.schedule.frequency, "weekly");
  }
  const alert = normalizeSchedule({ kind: "stale_deals" }, "u", "2");
  assert.ok(alert.ok && alert.schedule.days === 5 && alert.schedule.name === "Deals sin movimiento");
});

test("parseSchedules ignora basura y conserva el último resultado", () => {
  const stored = JSON.stringify([{ id: "a", userId: "u", kind: "prompt", prompt: "x", lastRunAt: "2026-11-16T14:00:00Z", lastResult: "ok" }, { id: "b" }, "basura"]);
  const out = parseSchedules(stored);
  assert.equal(out.length, 1);
  assert.equal(out[0].lastResult, "ok");
  assert.deepEqual(parseSchedules("no json"), []);
});

test("isScheduleDue: semanal en su día y hora, una sola vez por día", () => {
  const base = normalizeSchedule({ kind: "prompt", prompt: "x", frequency: "weekly", weeklyDay: 1, hour: 14, minute: 0 }, "u", "1");
  assert.ok(base.ok);
  if (!base.ok) return;
  assert.equal(isScheduleDue(base.schedule, "UTC", NOW), true);
  assert.equal(isScheduleDue({ ...base.schedule, weeklyDay: 2 }, "UTC", NOW), false);
  assert.equal(isScheduleDue({ ...base.schedule, lastRunAt: "2026-11-23T14:00:00Z" }, "UTC", NOW), false);
  assert.equal(isScheduleDue({ ...base.schedule, enabled: false }, "UTC", NOW), false);
});

test("alertas: solo lo que pasa el umbral, lo más viejo primero", () => {
  const deals = staleDealLines([
    { title: "A", updatedAt: d("2026-11-10T00:00:00Z"), stageName: "Nuevo", value: 100 },
    { title: "B", updatedAt: d("2026-11-22T00:00:00Z"), stageName: "Nuevo", value: null },
    { title: "C", updatedAt: d("2026-10-01T00:00:00Z"), stageName: "En proceso", value: null },
  ], 5, NOW);
  assert.equal(deals.length, 2);
  assert.match(deals[0], /^• C/);

  const content = lateContentLines([
    { title: "Reel 1", date: d("2026-11-10T12:00:00Z"), clientName: "Luna", publishStatus: "pendiente" },
    { title: "Reel 2", date: d("2026-11-10T12:00:00Z"), clientName: "Luna", publishStatus: "subido" },
    { title: "Reel 3", date: d("2026-11-22T12:00:00Z"), clientName: "Luna", publishStatus: "pendiente" },
  ], 3, NOW);
  assert.deepEqual(content.length, 1);

  const pay = overduePaymentLines([
    { clientName: "Norte", amount: 500, currency: "USD", dueDate: d("2026-11-01T00:00:00Z"), month: 11, year: 2026 },
    { clientName: "Sin fecha", amount: 1, currency: "USD", dueDate: null, month: 11, year: 2026 },
  ], 5, NOW);
  assert.equal(pay.length, 1);
});

test("alertMessage queda vacío sin novedades y recorta las listas largas", () => {
  assert.equal(alertMessage("stale_deals", []), "");
  const many = Array.from({ length: 20 }, (_, i) => `• ${i}`);
  assert.match(alertMessage("late_content", many), /y 5 más/);
});
