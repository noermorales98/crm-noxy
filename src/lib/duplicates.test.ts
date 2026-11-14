import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { findDuplicateContacts, findDuplicateForms, normalizeEmail, normalizeName, normalizePhone } from "./duplicates.ts";

const c = (id: string, email: string | null, phone: string | null, createdAt: string, firstName = "X") =>
  ({ id, firstName, lastName: null, email, phone, createdAt: new Date(createdAt) });

test("normaliza correo, teléfono (últimos 10 dígitos) y nombre", () => {
  assert.equal(normalizeEmail("  Ana@Mail.COM "), "ana@mail.com");
  assert.equal(normalizeEmail("sin-arroba"), null);
  assert.equal(normalizePhone("+52 998 123 4567"), "9981234567");
  assert.equal(normalizePhone("998-123-4567"), "9981234567");
  assert.equal(normalizePhone("123"), null);
  assert.equal(normalizeName("  Agenda  tu DEMO! "), "agenda tu demo");
  assert.equal(normalizeName("Cotización"), "cotizacion");
});

test("agrupa contactos por correo o teléfono y conserva el más antiguo", () => {
  const groups: any[] = findDuplicateContacts([
    c("2", "ana@mail.com", null, "2026-02-01"),
    c("1", "ANA@mail.com", "+52 998 123 4567", "2026-01-01"),
    c("3", null, "9981234567", "2026-03-01"),
    c("4", "otro@mail.com", null, "2026-01-05"),
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].keep.id, "1");
  assert.deepEqual(groups[0].duplicates.map((d: any) => d.id), ["2", "3"]);
  assert.match(groups[0].reason, /correo/);
  assert.match(groups[0].reason, /teléfono/);
});

test("contactos sin correo ni teléfono nunca se agrupan", () => {
  assert.deepEqual(findDuplicateContacts([c("1", null, null, "2026-01-01"), c("2", null, null, "2026-01-02")]), []);
});

test("formularios con el mismo nombre se agrupan; empresas distintas no", () => {
  const f = (id: string, name: string, companyId: string, createdAt: string) => ({ id, name, companyId, isActive: true, createdAt: new Date(createdAt) });
  const groups: any[] = findDuplicateForms([
    f("1", "Agenda tu demo", "a", "2026-01-01"),
    f("2", "agenda  tu demo", "a", "2026-02-01"),
    f("3", "Agenda tu demo", "b", "2026-03-01"),
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].keep.id, "1");
  assert.deepEqual(groups[0].duplicates.map((d: any) => d.id), ["2"]);
});
