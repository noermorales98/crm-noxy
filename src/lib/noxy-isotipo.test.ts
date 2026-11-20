import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { noxyIsotipoMarker, noxyIsotipoSvg, parseNoxyIsotipo, resolveLogoSrc } from "./noxy-isotipo.ts";

test("el marcador cabe en VARCHAR(191) y se lee de vuelta", () => {
  const marker = noxyIsotipoMarker("#ff0000");
  assert.equal(marker, "noxy-isotipo:#FF0000");
  assert.ok(marker.length < 191);
  assert.deepEqual(parseNoxyIsotipo(marker), { link: "#FF0000", pdf: "#FF0000" });
});

test("un logo personalizado o vacío no es el isotipo", () => {
  assert.equal(parseNoxyIsotipo("https://x.test/logo.png"), null);
  assert.equal(parseNoxyIsotipo(""), null);
  assert.equal(parseNoxyIsotipo(null), null);
});

test("un color inválido cae al azul por defecto", () => {
  assert.equal(noxyIsotipoMarker("rojo"), "noxy-isotipo:#3545D6");
  assert.deepEqual(parseNoxyIsotipo("noxy-isotipo:<script>"), { link: "#3545D6", pdf: "#3545D6" });
  assert.match(noxyIsotipoSvg('"><script>'), /fill="#3545D6"/);
});

test("resolveLogoSrc convierte el marcador en imagen y deja pasar URLs", () => {
  assert.match(resolveLogoSrc("noxy-isotipo:#112233")!, /^data:image\/svg\+xml;utf8,.*%23112233/);
  assert.equal(resolveLogoSrc("https://x.test/logo.png"), "https://x.test/logo.png");
  assert.equal(resolveLogoSrc(null), null);
});

test("enlace y PDF pueden tener colores distintos", () => {
  const marker = noxyIsotipoMarker("#112233", "#ffffff");
  assert.equal(marker, "noxy-isotipo:#112233|#FFFFFF");
  assert.ok(marker.length < 191);
  assert.deepEqual(parseNoxyIsotipo(marker), { link: "#112233", pdf: "#FFFFFF" });
  assert.match(resolveLogoSrc(marker, "link")!, /%23112233/);
  assert.match(resolveLogoSrc(marker, "pdf")!, /%23FFFFFF/);
  assert.match(resolveLogoSrc(marker)!, /%23112233/); // por defecto, el del enlace
});

test("un solo color aplica a ambos y un PDF inválido cae al del enlace", () => {
  assert.equal(noxyIsotipoMarker("#112233", "#112233"), "noxy-isotipo:#112233");
  assert.deepEqual(parseNoxyIsotipo("noxy-isotipo:#112233|zzz"), { link: "#112233", pdf: "#112233" });
});
