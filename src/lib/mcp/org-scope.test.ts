import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { connectorUrl, pickMcpOrganization } from "./org-scope.ts";

test("sin parámetro o con la base, se usa la base", () => {
  assert.deepEqual(pickMcpOrganization("base", null, ["a"]), { ok: true, organizationId: "base" });
  assert.deepEqual(pickMcpOrganization("base", "base", []), { ok: true, organizationId: "base" });
});

test("solo se acepta una organización de la lista permitida", () => {
  assert.deepEqual(pickMcpOrganization("base", "a", ["a", "b"]), { ok: true, organizationId: "a" });
  assert.equal(pickMcpOrganization("base", "ajena", ["a", "b"]).ok, false);
  assert.equal(pickMcpOrganization("base", "ajena", []).ok, false);
});

test("el enlace del conector lleva ?org solo para las que no son la base", () => {
  assert.equal(connectorUrl("https://noxthy.co/", "base", "base"), "https://noxthy.co/mcp");
  assert.equal(connectorUrl("https://noxthy.co", "base", "x y"), "https://noxthy.co/mcp?org=x%20y");
});
