import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { noxyIsotipoMarker, noxyIsotipoSvg, parseNoxyIsotipoColor, resolveLogoSrc } from "./noxy-isotipo.ts";

test("el marcador cabe en VARCHAR(191) y se lee de vuelta", () => {
  const marker = noxyIsotipoMarker("#ff0000");
  assert.equal(marker, "noxy-isotipo:#FF0000");
  assert.ok(marker.length < 191);
  assert.equal(parseNoxyIsotipoColor(marker), "#FF0000");
});

test("un logo personalizado o vacío no es el isotipo", () => {
  assert.equal(parseNoxyIsotipoColor("https://x.test/logo.png"), null);
  assert.equal(parseNoxyIsotipoColor(""), null);
  assert.equal(parseNoxyIsotipoColor(null), null);
});

test("un color inválido cae al azul por defecto", () => {
  assert.equal(noxyIsotipoMarker("rojo"), "noxy-isotipo:#3545D6");
  assert.equal(parseNoxyIsotipoColor("noxy-isotipo:<script>"), "#3545D6");
  assert.match(noxyIsotipoSvg('"><script>'), /fill="#3545D6"/);
});

test("resolveLogoSrc convierte el marcador en imagen y deja pasar URLs", () => {
  assert.match(resolveLogoSrc("noxy-isotipo:#112233")!, /^data:image\/svg\+xml;utf8,.*%23112233/);
  assert.equal(resolveLogoSrc("https://x.test/logo.png"), "https://x.test/logo.png");
  assert.equal(resolveLogoSrc(null), null);
});
