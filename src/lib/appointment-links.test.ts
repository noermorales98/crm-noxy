import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { contactAfterDealLink, readLinkChange } from "./appointment-links.ts";

test("readLinkChange distingue no tocar, desvincular y vincular", () => {
  assert.equal(readLinkChange({}, "dealId"), undefined);
  assert.equal(readLinkChange({ dealId: null }, "dealId"), null);
  assert.equal(readLinkChange({ dealId: "" }, "dealId"), null);
  assert.equal(readLinkChange({ dealId: "d1" }, "dealId"), "d1");
  assert.equal(readLinkChange({ dealId: 5 }, "dealId"), undefined);
});

test("al vincular un lead la cita sin contacto adopta el del lead", () => {
  assert.equal(contactAfterDealLink({ requestedContact: undefined, currentContactId: null, dealContactId: "c1" }), "c1");
});

test("al vincular un lead no se pisa el contacto que la cita ya tenía", () => {
  assert.equal(contactAfterDealLink({ requestedContact: undefined, currentContactId: "c0", dealContactId: "c1" }), undefined);
});

test("un contacto pedido de forma explícita manda sobre el del lead", () => {
  assert.equal(contactAfterDealLink({ requestedContact: "c9", currentContactId: null, dealContactId: "c1" }), "c9");
  assert.equal(contactAfterDealLink({ requestedContact: null, currentContactId: "c0", dealContactId: "c1" }), null);
});

test("un lead sin contacto no cambia el de la cita", () => {
  assert.equal(contactAfterDealLink({ requestedContact: undefined, currentContactId: null, dealContactId: null }), undefined);
});
