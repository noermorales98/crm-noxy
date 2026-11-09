import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { CRM_SEARCH_PAGES, matchCrmSearchPages } from "./crm-search-pages.ts";
// @ts-expect-error: node --test carga el .ts directo
import { NAV_DESTINATIONS, SETTINGS_ITEMS } from "./crm-navigation.ts";

type Page = { id: string; title: string; href: string };

test("every sidebar destination and settings page can be found", () => {
  const hrefs = new Set((CRM_SEARCH_PAGES as Page[]).map((page) => page.href));
  for (const destination of NAV_DESTINATIONS as unknown as Array<{ href: string; label: string }>) {
    assert.ok(hrefs.has(destination.href), `${destination.label} (${destination.href}) is searchable`);
  }
  for (const item of SETTINGS_ITEMS as unknown as Array<{ href: string; label: string }>) {
    assert.ok(hrefs.has(item.href), `${item.label} (${item.href}) is searchable`);
  }
  for (const href of ["/profile", "/projects/create", "/cotizaciones/nueva", "/cotizaciones/configuracion", "/assistant/new"]) {
    assert.ok(hrefs.has(href), `${href} is searchable`);
  }
});

test("ids and hrefs are unique", () => {
  const pages = CRM_SEARCH_PAGES as Page[];
  assert.equal(new Set(pages.map((p) => p.id)).size, pages.length);
  assert.equal(new Set(pages.map((p) => p.href)).size, pages.length);
});

test("matching ignores accents and case and requires every word", () => {
  const titles = (q: string) => (matchCrmSearchPages(q, 10) as Page[]).map((p) => p.title);
  assert.ok(titles("boveda").includes("Bóveda"));
  assert.ok(titles("BÓVEDA").includes("Bóveda"));
  assert.ok(titles("nueva cotizacion").includes("Nueva cotización"));
  assert.ok(titles("tipos cita").includes("Tipos de cita"));
  assert.deepEqual(titles("zzzz"), []);
});

test("an exact title match ranks first", () => {
  assert.equal((matchCrmSearchPages("tareas", 5) as Page[])[0].title, "Tareas");
});
