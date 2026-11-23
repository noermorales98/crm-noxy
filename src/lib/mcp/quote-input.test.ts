import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { canEditQuote, quoteScalarData, validateQuoteEdit } from "./quote-input.ts";

test("solo se editan cotizaciones en borrador o enviadas", () => {
  assert.equal(canEditQuote("BORRADOR"), true);
  assert.equal(canEditQuote("ENVIADA"), true);
  for (const s of ["ACEPTADA", "PARCIAL", "PAGADA", "VENCIDA", "RECHAZADA"]) assert.equal(canEditQuote(s), false);
});

test("validateQuoteEdit exige al menos un cambio y rechaza datos inválidos", () => {
  assert.match(validateQuoteEdit({})!, /al menos un campo/);
  assert.match(validateQuoteEdit({ clientEmail: "no-es-correo" })!, /formato válido/);
  assert.match(validateQuoteEdit({ clientName: "  " })!, /vacío/);
  assert.match(validateQuoteEdit({ taxRate: 120 })!, /entre 0 y 100/);
  assert.match(validateQuoteEdit({ items: [] })!, /al menos un concepto/);
  assert.match(validateQuoteEdit({ items: [{ description: "", quantity: 1, unitPrice: 5 }] })!, /sin descripción|no tiene descripción/);
  assert.match(validateQuoteEdit({ items: [{ description: "A", quantity: 0, unitPrice: 5 }] })!, /cantidad/);
  assert.match(validateQuoteEdit({ validUntil: "nunca" })!, /vigencia/);
});

test("validateQuoteEdit acepta ediciones válidas, incluido agregar el correo", () => {
  assert.equal(validateQuoteEdit({ clientEmail: "ana@ejemplo.com" }), null);
  assert.equal(validateQuoteEdit({ items: [{ description: "Diseño", quantity: 2, unitPrice: 100 }], taxRate: 16 }), null);
  assert.equal(validateQuoteEdit({ clientEmail: null }), null);
});

test("quoteScalarData limpia valores y convierte la vigencia", () => {
  const data = quoteScalarData({ clientName: " Ana ", clientEmail: "", validUntil: "2026-12-31", notes: null });
  assert.equal(data.clientName, "Ana");
  assert.equal(data.clientEmail, null);
  assert.equal(data.notes, null);
  assert.ok(data.validUntil instanceof Date);
  assert.equal("terms" in data, false);
});
