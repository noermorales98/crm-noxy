import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { ALL_PERMISSIONS, SECTION_PERMISSION } from "./permissions.ts";
import {
  CONTEXTUAL_SECTIONS,
  MOBILE_TABS,
  NAV_GROUPS,
  MOBILE_TAB_ACTIVE,
  NAV_ITEM_ACTIVE,
  AREA_ITEMS,
  NAV_DESTINATIONS,
  activeFlatEntry,
  activeMobileTab,
  activeNavHref,
  visibleAreaItems,
  contextualSectionFor,
  contextualSectionLabel,
  visibleMobileTabs,
  visibleNavGroups,
  sidebarView,
  // @ts-expect-error Node's native TypeScript runner requires an explicit extension.
} from "./crm-navigation.ts";

// Modelo de navegación del shell (spec: Behaviour «Navegación»; ronda 2: áreas con submenú).
type Item = { kind?: string; href: string; label: string; permission: string; badge?: string; section?: string };
type Group = { label: string; items: Item[] };

// Primer nivel: destinos directos y entradas de área (›) que abren su submenú.
const EXPECTED_TOP: Array<[string, Array<[string, string, string]>]> = [
  ["Principal", [["link", "Inicio", "/"], ["area", "Contactos", "/contacts"], ["link", "Tareas", "/tasks"], ["link", "Proyectos", "/projects"]]],
  ["Áreas", [["area", "Ventas", "/pipeline"], ["area", "Agenda", "/appointments"]]],
  ["Espacios", [["link", "Correo", "/emails"], ["link", "Docs", "/kb"], ["link", "Asistente", "/assistant"], ["link", "Bóveda", "/boveda"], ["link", "Gestión de contenido", "/contenido/general"]]],
];
const EXPECTED_AREAS: Record<string, Array<[string, string]>> = {
  contacts: [["Contactos", "/contacts"], ["Empresas", "/companies"]],
  sales: [["Pipeline de ventas", "/pipeline"], ["Clientes", "/pipeline/clientes"], ["Cotizaciones", "/cotizaciones"], ["Formularios", "/forms"]],
  agenda: [["Citas Agendadas", "/appointments"], ["Tipos de Cita", "/appointment-types"], ["Disponibilidad", "/availability"]],
};
const SPACE_SECTION: Record<string, string> = {
  "/emails": "mail",
  "/kb": "kb",
  "/assistant": "assistant",
  "/boveda": "vault",
  "/contenido/general": "content",
};

test("NAV_GROUPS shows 11 entries in 3 groups: direct destinations and areas", () => {
  assert.deepEqual(
    (NAV_GROUPS as Group[]).map((g) => [g.label, g.items.map((i) => [i.kind === "area" ? "area" : "link", i.label, i.href])]),
    EXPECTED_TOP,
  );
  const areas = (NAV_GROUPS as Group[]).flatMap((g) => g.items).filter((i) => i.kind === "area");
  assert.deepEqual(areas.map((a) => a.section), ["contacts", "sales", "agenda"]);
});

test("each area lists its destinations with the labels and routes of always; the entry opens the first one", () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(AREA_ITEMS as unknown as Record<string, Item[]>).map(([k, items]) => [k, items.map((i) => [i.label, i.href])])),
    EXPECTED_AREAS,
  );
  for (const area of (NAV_GROUPS as Group[]).flatMap((g) => g.items).filter((i) => i.kind === "area")) {
    assert.equal(area.href, (AREA_ITEMS as unknown as Record<string, Item[]>)[area.section!][0].href, `${area.label} opens its first destination`);
  }
});

test("the 17 destinations stay reachable, once each, with the permission that gated them", () => {
  const all = NAV_DESTINATIONS as Item[];
  assert.equal(all.length, 17);
  assert.equal(new Set(all.map((i) => i.href)).size, 17, "no duplicates");
  for (const item of all) {
    const expected = SPACE_SECTION[item.href] ? SECTION_PERMISSION[SPACE_SECTION[item.href]] : "crm";
    assert.equal(item.permission, expected, item.label);
  }
});

test("only Correo carries the existing unread-mail counter", () => {
  const badges = (NAV_DESTINATIONS as Item[]).filter((i) => i.badge);
  assert.deepEqual(badges.map((i) => [i.href, i.badge]), [["/emails", "unread-mail"]]);
});

test("visibleNavGroups filters by permission, hides areas with no visible destination and drops empty groups", () => {
  assert.deepEqual(
    (visibleNavGroups("OWNER", ALL_PERMISSIONS) as Group[]).map((g) => [g.label, g.items.length]),
    [["Principal", 4], ["Áreas", 2], ["Espacios", 5]],
    "owner sees everything",
  );
  // Sin rol ni permisos (sesión antigua o cargando) `hasPermission` deja pasar: se conserva ese comportamiento.
  assert.equal((visibleNavGroups(undefined, undefined) as Group[]).flatMap((g) => g.items).length, 11, "legacy session keeps today's behaviour");
  const mailOnly = { ...Object.fromEntries(Object.keys(ALL_PERMISSIONS).map((k) => [k, false])), mail: true };
  const groups = visibleNavGroups("MEMBER", mailOnly) as Group[];
  assert.deepEqual(groups.map((g) => g.label), ["Espacios"]);
  assert.deepEqual(groups[0].items.map((i) => i.href), ["/emails"]);
  const noCrm = { ...ALL_PERMISSIONS, crm: false };
  const entries = (visibleNavGroups("MEMBER", noCrm) as Group[]).flatMap((g) => g.items);
  assert.ok(!entries.some((i) => i.kind === "area" || i.permission === "crm"), "crm destinations and areas hidden");
  assert.deepEqual(visibleAreaItems("sales", "MEMBER", noCrm), [], "area submenu also filtered");
  assert.equal(visibleAreaItems("sales", "OWNER", ALL_PERMISSIONS).length, 4);
});

test("contextual sections: the three areas plus Correo (incl. campañas), Docs, Bóveda, Asistente y Contenido", () => {
  assert.deepEqual([...CONTEXTUAL_SECTIONS].sort(), ["agenda", "assistant", "contacts", "content", "kb", "mail", "sales", "vault"]);
  const cases: Array<[string, string | null]> = [
    ["/contacts", "contacts"],
    ["/contacts/12", "contacts"],
    ["/companies", "contacts"],
    ["/companies/42", "contacts"],
    ["/pipeline", "sales"],
    ["/pipeline/clientes", "sales"],
    ["/pipeline/historial", "sales"],
    ["/pipeline/abc", "sales"],
    ["/cotizaciones/nueva", "sales"],
    ["/forms/7", "sales"],
    ["/appointments", "agenda"],
    ["/appointment-types", "agenda"],
    ["/availability", "agenda"],
    ["/emails", "mail"],
    ["/campaigns", "mail"],
    ["/campaigns/abc", "mail"],
    ["/kb", "kb"],
    ["/kb/page-1", "kb"],
    ["/boveda/client-1", "vault"],
    ["/assistant/new", "assistant"],
    ["/contenido/general", "content"],
    ["/contenido", "content"],
    ["/contenido/client-7", "content"],
    ["/", null],
    ["/tasks", null],
    ["/projects/1", null],
    ["/settings", null],
    ["/kbase", null],
    ["/emailsx", null],
    ["/formsx", null],
  ];
  for (const [path, section] of cases) assert.equal(contextualSectionFor(path), section, path);
});

test("contextual headers reuse the entry labels", () => {
  const labels = Object.fromEntries((CONTEXTUAL_SECTIONS as string[]).map((s) => [s, contextualSectionLabel(s as never)]));
  assert.deepEqual(labels, {
    contacts: "Contactos",
    sales: "Ventas",
    agenda: "Agenda",
    mail: "Correo",
    kb: "Docs",
    vault: "Bóveda",
    assistant: "Asistente",
    content: "Gestión de contenido",
  });
});

test("in the flat list, an area entry is active on any of its routes; direct destinations by most specific match", () => {
  const groups = visibleNavGroups("OWNER", ALL_PERMISSIONS);
  const cases: Array<[string, string | null]> = [
    ["/", "/"],
    ["/companies/42", "/contacts"],
    ["/pipeline/clientes", "/pipeline"],
    ["/forms/7", "/pipeline"],
    ["/availability", "/appointments"],
    ["/tasks", "/tasks"],
    ["/campaigns", "/emails"],
    ["/contenido/general", "/contenido/general"],
    ["/settings", null],
  ];
  for (const [path, href] of cases) assert.equal(activeFlatEntry(path, groups), href, path);
});

test("activeNavHref picks the most specific destination; «/» only matches exactly", () => {
  const hrefs = (NAV_DESTINATIONS as Item[]).map((i) => i.href);
  const cases: Array<[string, string | null]> = [
    ["/", "/"],
    ["/contacts", "/contacts"],
    ["/companies/42", "/companies"],
    ["/pipeline", "/pipeline"],
    ["/pipeline/123", "/pipeline"],
    ["/pipeline/clientes", "/pipeline/clientes"],
    ["/pipeline/clientes/9", "/pipeline/clientes"],
    ["/contenido/general", "/contenido/general"],
    ["/settings", null],
    ["/companiesx", null],
  ];
  for (const [path, href] of cases) assert.equal(activeNavHref(path, hrefs), href, path);
});

test("mobile tabs are Inicio · Contactos · Pipeline · Tareas and respect the crm permission", () => {
  assert.deepEqual(
    (MOBILE_TABS as Item[]).map((t) => [t.label, t.href, t.permission]),
    [["Inicio", "/", "crm"], ["Contactos", "/contacts", "crm"], ["Pipeline", "/pipeline", "crm"], ["Tareas", "/tasks", "crm"]],
  );
  assert.deepEqual((visibleMobileTabs("OWNER", ALL_PERMISSIONS) as Item[]).map((t) => t.href), ["/", "/contacts", "/pipeline", "/tasks"]);
  assert.deepEqual(visibleMobileTabs("MEMBER", { ...ALL_PERMISSIONS, crm: false }), []);
});

test("the active mobile tab is the most specific match; other routes live under «Más»", () => {
  const cases: Array<[string, string | null]> = [
    ["/", "/"],
    ["/contacts/12", "/contacts"],
    ["/pipeline/clientes", "/pipeline"],
    ["/pipeline/historial", "/pipeline"],
    ["/tasks", "/tasks"],
    ["/companies", null],
    ["/campaigns", null],
    ["/emails", null],
  ];
  for (const [path, href] of cases) assert.equal(activeMobileTab(path, MOBILE_TABS), href, path);
});

test("«Volver» shows the flat list on that route; moving to another route decides again", () => {
  assert.deepEqual(sidebarView("/emails", null), { mode: "contextual", section: "mail" });
  assert.deepEqual(sidebarView("/emails", "/emails"), { mode: "flat" }, "Volver on /emails");
  assert.deepEqual(sidebarView("/kb/page-1", "/emails"), { mode: "contextual", section: "kb" }, "then Docs");
  assert.deepEqual(sidebarView("/emails", "/kb/page-1"), { mode: "contextual", section: "mail" }, "back to Correo");
  assert.deepEqual(sidebarView("/contacts", null), { mode: "contextual", section: "contacts" }, "areas open their submenu");
  assert.deepEqual(sidebarView("/contacts", "/contacts"), { mode: "flat" }, "Volver on an area");
  assert.deepEqual(sidebarView("/tasks", "/emails"), { mode: "flat" });
});

test("active styles carry the nav ink on text, icon and bar, plus weight (two signals)", () => {
  const ink = /(?:\[var\(--nav-active-ink\)\]|\(--nav-active-ink\))/.source;
  assert.match(NAV_ITEM_ACTIVE, new RegExp(`(?:^|\\s)text-${ink}(?=\\s|$)`), "text and icon (currentColor) use the ink");
  assert.match(NAV_ITEM_ACTIVE, new RegExp(`(?:^|\\s)before:bg-${ink}(?=\\s|$)`), "bar uses the ink");
  assert.match(NAV_ITEM_ACTIVE, /(?:^|\s)before:w-(?:\[3px\]|0\.75)(?=\s|$)/, "3px bar");
  assert.match(NAV_ITEM_ACTIVE, /(?:^|\s)font-semibold(?=\s|$)/);
  assert.match(NAV_ITEM_ACTIVE, /(?:^|\s)bg-surface-elevated(?=\s|$)/);
  assert.match(MOBILE_TAB_ACTIVE, new RegExp(`(?:^|\\s)text-${ink}(?=\\s|$)`));
  assert.match(MOBILE_TAB_ACTIVE, /(?:^|\s)font-semibold(?=\s|$)/);
});
