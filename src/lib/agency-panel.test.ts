import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { agencyMemberships, buildAgencyCard, monthLabel, readClose, sortAgencyCards } from "./agency-panel.ts";

const m = (organizationId: string, role: string, permissions: unknown = {}) => ({ organizationId, organizationName: organizationId, role, permissions });

test("el panel solo incluye organizaciones donde eres OWNER o tienes «agency» asignado", () => {
  const list = agencyMemberships([m("a", "OWNER"), m("b", "ADMIN"), m("c", "ADMIN", { agency: true }), m("d", "MEMBER"), m("e", "MEMBER", { agency: true }), m("f", "RARO")]);
  assert.deepEqual(list.map((x: { organizationId: string }) => x.organizationId), ["a", "c", "e"]);
});

test("readClose lee la foto mensual y tolera formas raras", () => {
  const close = readClose({ year: 2026, month: 10, metrics: { won: { count: 2, byCurrency: { USD: 500, MXN: "x" } }, closingRate: 40, paymentsReceived: { USD: 300 } } });
  assert.deepEqual(close, { month: "2026-10", wonCount: 2, won: { USD: 500 }, closingRate: 40, paymentsReceived: { USD: 300 } });
  assert.equal(readClose(null), null);
  assert.equal(readClose({ year: 2026, month: 10, metrics: "basura" }), null);
  assert.equal(readClose({ year: 2026, month: 10, metrics: {} })?.wonCount, 0);
});

test("buildAgencyCard marca la cuenta activa y suma la atención pendiente", () => {
  const card = buildAgencyCard({ organizationId: "a", name: "Casa Alba", currentOrganizationId: "a", openDeals: 3, wonThisMonth: { count: 1, byCurrency: { USD: 100 } }, overdueTasks: 2, pendingPayments: 1, snapshot: null });
  assert.equal(card.current, true);
  assert.equal(card.attention, 3);
  assert.equal(card.lastClose, null);
});

test("sortAgencyCards: más atención primero, luego la activa, luego por nombre", () => {
  const base = { openDeals: 0, wonThisMonth: { count: 0, byCurrency: {} }, lastClose: null, overdueTasks: 0, pendingPayments: 0 };
  const sorted = sortAgencyCards([
    { ...base, organizationId: "1", name: "Zeta", current: false, attention: 0 },
    { ...base, organizationId: "2", name: "Beta", current: true, attention: 0 },
    { ...base, organizationId: "3", name: "Alfa", current: false, attention: 0 },
    { ...base, organizationId: "4", name: "Urgente", current: false, attention: 5 },
  ]);
  assert.deepEqual(sorted.map((c: { name: string }) => c.name), ["Urgente", "Beta", "Alfa", "Zeta"]);
});

test("monthLabel pone el mes en español", () => {
  assert.equal(monthLabel("2026-10"), "octubre 2026");
  assert.equal(monthLabel("raro"), "raro");
});
