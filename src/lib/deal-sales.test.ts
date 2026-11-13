import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { dealToQuotePrefill, formatByCurrency, summarizeWonSales } from "./deal-sales.ts";

test("formatByCurrency lists each currency or says there is nothing", () => {
  assert.equal(formatByCurrency({ USD: 3000, MXN: 5000.5 }), "USD $3,000 | MXN $5,000.5");
  assert.equal(formatByCurrency({ MXN: 0 }), "MXN $0");
  assert.equal(formatByCurrency({}), "sin importe");
});

test("dealToQuotePrefill builds the quote form from a lead", () => {
  const prefill = dealToQuotePrefill({
    id: "d1",
    title: "Sitio web",
    value: 12000,
    currency: "MXN",
    contact: { id: "c1", firstName: "Ana", lastName: "Pérez", email: "ana@x.com", phone: "555" },
    company: { name: "Acme" },
  });
  assert.equal(prefill.dealId, "d1");
  assert.equal(prefill.contactId, "c1");
  assert.equal(prefill.clientName, "Ana Pérez");
  assert.equal(prefill.clientCompany, "Acme");
  assert.equal(prefill.currency, "MXN");
  assert.deepEqual(prefill.items, [{ description: "Sitio web", quantity: 1, unitPrice: 12000, discount: 0 }]);
});

test("dealToQuotePrefill copes with a lead that has no contact, value or company", () => {
  const prefill = dealToQuotePrefill({ id: "d2", title: "Lead sin datos", value: null, currency: "USD", contact: null, company: { name: "Beta" } });
  assert.equal(prefill.contactId, "");
  assert.equal(prefill.clientName, "Beta", "falls back to the company name");
  assert.equal(prefill.items[0].unitPrice, 0);
  assert.equal(dealToQuotePrefill({ id: "d3", title: "T", value: 1, currency: "USD", contact: null, company: null }).clientName, "T");
});

test("summarizeWonSales groups value by currency, splits month vs total and counts quotes", () => {
  const now = new Date("2026-11-15T12:00:00Z");
  const deals = [
    { value: 1000, currency: "USD", updatedAt: new Date("2026-11-03T00:00:00Z"), quotes: [{ status: "PAGADA", total: 1160, currency: "USD" }] },
    { value: 5000, currency: "MXN", updatedAt: new Date("2026-10-20T00:00:00Z"), quotes: [{ status: "BORRADOR", total: 5800, currency: "MXN" }] },
    { value: null, currency: "MXN", updatedAt: new Date("2026-11-10T00:00:00Z"), quotes: [] },
    { value: 2000, currency: "USD", updatedAt: new Date("2026-11-11T00:00:00Z"), quotes: [{ status: "ACEPTADA", total: 2320, currency: "USD" }, { status: "RECHAZADA", total: 999, currency: "USD" }] },
  ];
  const summary = summarizeWonSales(deals, now);
  assert.deepEqual(summary.total, { count: 4, byCurrency: { USD: 3000, MXN: 5000 } });
  assert.deepEqual(summary.month, { count: 3, byCurrency: { USD: 3000, MXN: 0 } });
  assert.equal(summary.withQuote, 3);
  assert.equal(summary.withoutQuote, 1);
  assert.deepEqual(summary.quotedByCurrency, { USD: 3480 }, "only accepted/partial/paid quotes count");
  assert.deepEqual(summary.paidByCurrency, { USD: 1160 });
});
