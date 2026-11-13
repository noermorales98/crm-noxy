import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { summarizeContact, summarizeClientPayments } from "./record-summary.ts";

test("summarizeContact counts open and won leads, won value per currency, quotes and the next appointment", () => {
  const now = new Date("2026-11-15T12:00:00Z");
  const summary = summarizeContact(
    {
      deals: [
        { value: 1000, currency: "USD", stage: { isWon: true, isLost: false } },
        { value: 500, currency: "USD", stage: { isWon: true, isLost: false } },
        { value: 8000, currency: "MXN", stage: { isWon: false, isLost: false } },
        { value: 300, currency: "MXN", stage: { isWon: false, isLost: true } },
      ],
      quotes: [
        { status: "PAGADA", total: 1160, currency: "USD" },
        { status: "BORRADOR", total: 90, currency: "USD" },
      ],
      appointments: [
        { startTime: new Date("2026-11-10T10:00:00Z"), status: "CONFIRMED" },
        { startTime: new Date("2026-11-20T10:00:00Z"), status: "CONFIRMED" },
        { startTime: new Date("2026-11-18T10:00:00Z"), status: "CANCELLED" },
        { startTime: new Date("2026-11-25T10:00:00Z"), status: "CONFIRMED" },
      ],
    },
    now,
  );
  assert.equal(summary.openLeads, 1);
  assert.equal(summary.wonLeads, 2);
  assert.deepEqual(summary.wonByCurrency, { USD: 1500 });
  assert.equal(summary.quotes, 2);
  assert.deepEqual(summary.paidByCurrency, { USD: 1160 });
  assert.equal(summary.nextAppointment?.toISOString(), "2026-11-20T10:00:00.000Z", "skips past and cancelled");
});

test("summarizeContact copes with no data", () => {
  const summary = summarizeContact({ deals: [], quotes: [], appointments: [] }, new Date());
  assert.equal(summary.openLeads, 0);
  assert.deepEqual(summary.wonByCurrency, {});
  assert.equal(summary.nextAppointment, null);
});

test("summarizeClientPayments totals received and pending and flags late payments", () => {
  const now = new Date("2026-11-15T12:00:00Z");
  const summary = summarizeClientPayments(
    [
      { amount: 1000, status: "RECIBIDO", dueDate: new Date("2026-09-05T00:00:00Z") },
      { amount: 1000, status: "RECIBIDO", dueDate: new Date("2026-10-05T00:00:00Z") },
      { amount: 1000, status: "PENDIENTE", dueDate: new Date("2026-11-05T00:00:00Z") },
      { amount: 1000, status: "PENDIENTE", dueDate: new Date("2026-12-05T00:00:00Z") },
      { amount: 1000, status: "CANCELADO", dueDate: new Date("2026-08-05T00:00:00Z") },
    ],
    now,
  );
  assert.equal(summary.received, 2000);
  assert.equal(summary.pending, 2000);
  assert.equal(summary.late, 1, "only the pending payment already past its due date");
  assert.equal(summary.count, 5);
});
