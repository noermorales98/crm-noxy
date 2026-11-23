import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { BRAND_COLORS, inkOn, parseOrgBrandPatch, resolveActiveThemeId } from "./org-brand.ts";

test("parseOrgBrandPatch acepta color, icono y tema válidos y normaliza el hex", () => {
  const r = parseOrgBrandPatch({ brandColor: "#0e9f9a", brandIcon: "chart", themeId: "noxy-obsidian" });
  assert.deepEqual(r, { ok: true, patch: { brandColor: "#0E9F9A", brandIcon: "chart", themeId: "noxy-obsidian" } });
});

test("null o vacío quita el valor; lo que no viene no se toca", () => {
  assert.deepEqual(parseOrgBrandPatch({ brandColor: null, themeId: "" }), { ok: true, patch: { brandColor: null, themeId: null } });
  assert.deepEqual(parseOrgBrandPatch({}), { ok: true, patch: {} });
});

test("rechaza color, icono y tema inventados", () => {
  assert.equal(parseOrgBrandPatch({ brandColor: "rojo" }).ok, false);
  assert.equal(parseOrgBrandPatch({ brandColor: "#12345" }).ok, false);
  assert.equal(parseOrgBrandPatch({ brandIcon: "<script>" }).ok, false);
  assert.equal(parseOrgBrandPatch({ themeId: "neon" }).ok, false);
});

test("el tema de la empresa gana al de la persona; sin él, el de la persona; sin ninguno, el de Noxy", () => {
  assert.deepEqual(resolveActiveThemeId("noxy-lime", "noxy-obsidian"), { themeId: "noxy-lime", lockedByOrg: true });
  assert.deepEqual(resolveActiveThemeId(null, "noxy-obsidian"), { themeId: "noxy-obsidian", lockedByOrg: false });
  assert.deepEqual(resolveActiveThemeId(null, undefined), { themeId: "noxy-indigo", lockedByOrg: false });
  assert.deepEqual(resolveActiveThemeId("basura", "noxy-obsidian"), { themeId: "noxy-obsidian", lockedByOrg: false });
});

test("inkOn elige blanco sobre fondos oscuros y obsidiana sobre claros", () => {
  assert.equal(inkOn("#3545D6"), "#FFFFFF");
  assert.equal(inkOn("#0B0B18"), "#FFFFFF");
  assert.equal(inkOn("#C8FE37"), "#0B0B18");
  assert.equal(inkOn("no-es-hex"), "#FFFFFF");
});

test("la paleta no incluye violeta ni repite colores", () => {
  const hexes = BRAND_COLORS.map((c: { hex: string }) => c.hex);
  assert.equal(new Set(hexes).size, hexes.length);
});
