import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { dueAlertMessage, effectivePaymentStatus, localDayNumber, monthlyDueDate, needsDueAlert } from "./payment-status.ts";

const TZ = "America/Cancun"; // UTC-5 todo el año
const due = (iso: string) => ({ status: "PENDIENTE", dueDate: new Date(`${iso}T00:00:00Z`) });

test("localDayNumber usa el día de Cancún, no el de UTC", () => {
  // 2026-11-15 02:00 UTC = 2026-11-14 21:00 en Cancún
  const a = localDayNumber(new Date("2026-11-15T02:00:00Z"), TZ);
  const b = localDayNumber(new Date("2026-11-14T12:00:00Z"), TZ);
  assert.equal(a, b);
});

test("Vencido es calculado: PENDIENTE con fecha pasada; RECIBIDO nunca vence", () => {
  const now = new Date("2026-11-14T15:00:00Z");
  assert.equal(effectivePaymentStatus(due("2026-11-13"), now, TZ), "VENCIDO");
  assert.equal(effectivePaymentStatus(due("2026-11-14"), now, TZ), "PENDIENTE");
  assert.equal(effectivePaymentStatus({ status: "RECIBIDO", dueDate: new Date("2026-01-01") }, now, TZ), "RECIBIDO");
  assert.equal(effectivePaymentStatus({ status: "PENDIENTE", dueDate: null }, now, TZ), "PENDIENTE");
});

test("alerta: 2 días antes, una sola vez, no si ya venció ni si ya se avisó", () => {
  const now = new Date("2026-11-14T15:00:00Z");
  assert.equal(needsDueAlert(due("2026-11-16"), now, TZ), true);
  assert.equal(needsDueAlert(due("2026-11-14"), now, TZ), true);
  assert.equal(needsDueAlert(due("2026-11-17"), now, TZ), false);
  assert.equal(needsDueAlert(due("2026-11-13"), now, TZ), false);
  assert.equal(needsDueAlert({ ...due("2026-11-16"), dueAlertSentAt: new Date() }, now, TZ), false);
  assert.equal(needsDueAlert({ status: "RECIBIDO", dueDate: new Date("2026-11-16") }, now, TZ), false);
});

test("monthlyDueDate limita el día de cobro al último del mes", () => {
  assert.equal(monthlyDueDate({ year: 2026, month: 2, billingDay: 31 }).toISOString(), "2026-02-28T00:00:00.000Z");
  assert.equal(monthlyDueDate({ year: 2026, month: 11, billingDay: 5 }).toISOString(), "2026-11-05T00:00:00.000Z");
});

test("dueAlertMessage dice hoy, mañana o en N días", () => {
  assert.match(dueAlertMessage({ who: "Ana", amount: 500, currency: "USD", days: 0 }), /hoy/);
  assert.match(dueAlertMessage({ who: "Ana", amount: 500, currency: "USD", days: 1 }), /mañana/);
  assert.match(dueAlertMessage({ who: "Ana", amount: 500, currency: "USD", days: 2 }), /en 2 días/);
});
