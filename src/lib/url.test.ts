import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { publicUrls } from "./url.ts";

test("publicUrls arma los enlaces público y del CRM sin barras dobles", () => {
  const urls = publicUrls("https://crm.test/");
  assert.equal(urls.quotePublic("tok123"), "https://crm.test/cotizar/tok123");
  assert.equal(urls.quoteCrm("COT-2026-0004"), "https://crm.test/cotizaciones/COT-2026-0004");
  assert.equal(urls.dealCrm("d1"), "https://crm.test/pipeline/d1");
  assert.equal(urls.contentClientCrm("c1"), "https://crm.test/contenido/c1");
});
