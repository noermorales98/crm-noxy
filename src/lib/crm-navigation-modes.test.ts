import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { ALL_PERMISSIONS } from "./permissions.ts";
import {
  MODE_STORAGE_KEY,
  CONTEXT_OWNER_HREF,
  modeHome,
  NAV_DESTINATIONS,
  NAV_MODES,
  contextPanelFor,
  modeForPath,
  modeGroups,
  parseMode,
  resolveMode,
  visibleModes,
  // @ts-expect-error Node's native TypeScript runner requires an explicit extension.
} from "./crm-navigation.ts";

// Modelo de navegación por modos (spec rediseno-obsidiana-estructural, Revisions «Ronda 3»).
type Entry = { kind?: string; href: string; label: string; permission: string; badge?: string };
type Group = { label: string; items: Entry[] };
const shape = (groups: readonly Group[]) => groups.map((g) => [g.label, g.items.map((i) => [i.label, i.href])]);
const mode = (key: string) => (NAV_MODES as unknown as Array<{ key: string; label: string; groups: Group[] }>).find((m) => m.key === key)!;

test("four modes (Trabajo, Ventas, Espacios, Contenido) with their short flat lists, in order", () => {
  assert.deepEqual(
    (NAV_MODES as unknown as Array<{ key: string; label: string }>).map((m) => [m.key, m.label]),
    [["work", "Trabajo"], ["sales", "Ventas"], ["spaces", "Espacios"], ["content", "Contenido"]],
  );
  assert.deepEqual(shape(mode("work").groups), [
    ["Principal", [["Inicio", "/"], ["Tareas", "/tasks"], ["Proyectos", "/projects"], ["Contactos", "/contacts"], ["Empresas", "/companies"]]],
    ["Agenda", [["Citas Agendadas", "/appointments"], ["Tipos de Cita", "/appointment-types"], ["Disponibilidad", "/availability"]]],
  ]);
  assert.deepEqual(shape(mode("sales").groups), [
    ["Ventas", [["Pipeline de ventas", "/pipeline"], ["Clientes", "/pipeline/clientes"], ["Historial de tratos", "/pipeline/historial"], ["Cotizaciones", "/cotizaciones"], ["Formularios", "/forms"]]],
  ]);
  assert.deepEqual(shape(mode("spaces").groups), [
    ["Espacios", [["Correo", "/emails"], ["Docs", "/kb"], ["Asistente", "/assistant"], ["Bóveda", "/boveda"]]],
  ]);
  assert.deepEqual(shape(mode("content").groups), [
    ["Contenido", [["Resumen", "/contenido"], ["Clientes", "/contenido/clientes"], ["Calendario", "/contenido/general"], ["Recordatorios", "/contenido/recordatorios"]]],
  ]);
});

test("no mode has a branch: every entry is a plain link and no mode lists more than 8 entries", () => {
  for (const m of NAV_MODES as unknown as Array<{ key: string; groups: Group[] }>) {
    const entries = m.groups.flatMap((g) => g.items);
    assert.ok(entries.every((e) => e.kind !== "area"), `${m.key}: no area entries`);
    assert.ok(entries.length <= 8, `${m.key}: ${entries.length} entries`);
  }
});

test("every destination lives in exactly one mode (plus the new Contenido screens), with the same permission as before", () => {
  const all = (NAV_MODES as unknown as Array<{ groups: Group[] }>).flatMap((m) => m.groups.flatMap((g) => g.items));
  const hrefs = all.map((e) => e.href);
  assert.equal(new Set(hrefs).size, hrefs.length, "no destination in two modes");
  const extra = ["/contenido", "/contenido/clientes", "/contenido/recordatorios"];
  assert.deepEqual([...hrefs].sort(), [...(NAV_DESTINATIONS as Entry[]).map((d) => d.href), ...extra].sort(), "same destinations as the flat model plus the Contenido screens");
  const byHref = new Map((NAV_DESTINATIONS as Entry[]).map((d) => [d.href, d]));
  for (const e of all) assert.equal(e.permission, byHref.get(e.href)?.permission ?? "content", e.label);
  assert.deepEqual(all.filter((e) => e.badge).map((e) => [e.href, e.badge]), [["/emails", "unread-mail"]], "only Correo keeps the unread counter");
});

test("visibleModes and modeGroups filter by permission and hide a mode with nothing to show", () => {
  assert.deepEqual((visibleModes("OWNER", ALL_PERMISSIONS) as Array<{ key: string }>).map((m) => m.key), ["work", "sales", "spaces", "content"]);
  assert.deepEqual((visibleModes(undefined, undefined) as Array<{ key: string }>).map((m) => m.key), ["work", "sales", "spaces", "content"], "legacy session keeps everything");
  const noCrm = { ...ALL_PERMISSIONS, crm: false };
  assert.deepEqual((visibleModes("MEMBER", noCrm) as Array<{ key: string }>).map((m) => m.key), ["spaces", "content"]);
  const mailOnly = { ...Object.fromEntries(Object.keys(ALL_PERMISSIONS).map((k) => [k, false])), mail: true };
  const spaces = visibleModes("MEMBER", mailOnly) as Array<{ key: string; groups: Group[] }>;
  assert.deepEqual(spaces.map((m) => m.key), ["spaces"]);
  assert.deepEqual(spaces[0].groups.flatMap((g) => g.items.map((i) => i.href)), ["/emails"]);
  assert.deepEqual(modeGroups("sales", "MEMBER", noCrm), [], "an empty mode has no groups");
  assert.equal((modeGroups("work", "OWNER", ALL_PERMISSIONS) as Group[]).length, 2);
});

test("modeForPath picks the mode that owns the route (most specific match, sections included)", () => {
  const cases: Array<[string, string | null]> = [
    ["/", "work"],
    ["/tasks", "work"],
    ["/projects/42", "work"],
    ["/contacts/9", "work"],
    ["/companies", "work"],
    ["/appointments", "work"],
    ["/appointment-types", "work"],
    ["/availability", "work"],
    ["/pipeline", "sales"],
    ["/pipeline/123", "sales"],
    ["/pipeline/clientes", "sales"],
    ["/pipeline/historial", "sales"],
    ["/cotizaciones/nueva", "sales"],
    ["/forms/7", "sales"],
    ["/emails", "spaces"],
    ["/campaigns", "spaces"],
    ["/kb/page-1", "spaces"],
    ["/assistant/new", "spaces"],
    ["/boveda/client-1", "spaces"],
    ["/contenido", "content"],
    ["/contenido/clientes", "content"],
    ["/contenido/recordatorios", "content"],
    ["/contenido/general", "content"],
    ["/contenido/client-7", "content"],
    ["/settings", null],
    ["/settings/equipo", null],
    ["/profile", null],
    ["/tasksx", null],
  ];
  for (const [path, expected] of cases) assert.equal(modeForPath(path), expected, path);
});

test("resolveMode: the route wins, then the stored mode, then Trabajo; parseMode rejects junk", () => {
  assert.equal(resolveMode("/pipeline", "work"), "sales", "a route in another mode switches the mode");
  assert.equal(resolveMode("/settings", "sales"), "sales", "a route with no mode keeps the stored one");
  assert.equal(resolveMode("/settings", null), "work");
  assert.equal(resolveMode("/profile", "nope"), "work", "junk storage falls back");
  assert.equal(parseMode("spaces"), "spaces");
  assert.equal(parseMode("content"), "content");
  assert.equal(parseMode("Ventas"), null);
  assert.equal(parseMode(null), null);
  assert.equal(parseMode(undefined), null);
});

test("each context list opens under exactly one sidebar item", () => {
  assert.deepEqual(CONTEXT_OWNER_HREF, { mail: "/emails", kb: "/kb", vault: "/boveda" });
});

test("contextPanelFor: only Correo (incl. campañas), Docs and Bóveda have their own list (Contenido has none)", () => {
  const cases: Array<[string, string | null]> = [
    ["/emails", "mail"],
    ["/campaigns", "mail"],
    ["/campaigns/abc", "mail"],
    ["/kb", "kb"],
    ["/kb/page-1", "kb"],
    ["/boveda/client-1", "vault"],
    ["/contenido/general", null],
    ["/contenido/client-7", null],
    ["/assistant/new", null],
    ["/", null],
    ["/tasks", null],
    ["/contacts", null],
    ["/pipeline", null],
    ["/kbase", null],
  ];
  for (const [path, expected] of cases) assert.equal(contextPanelFor(path), expected, path);
});

test("storage keys are stable and distinct from the old tree keys", () => {
  assert.equal(MODE_STORAGE_KEY, "noxy.sidebar.mode");
});

test("modeHome is the first visible screen of a mode (clicking a mode opens it)", () => {
  assert.equal(modeHome(visibleModes("OWNER", ALL_PERMISSIONS).find((m) => m.key === "work")!), "/");
  const sales = visibleModes("OWNER", ALL_PERMISSIONS).find((m) => m.key === "sales")!;
  assert.equal(modeHome(sales), "/pipeline");
  const spaces = visibleModes("OWNER", ALL_PERMISSIONS).find((m) => m.key === "spaces")!;
  assert.equal(modeHome(spaces), "/emails");
  assert.equal(modeHome({ key: "work", label: "Trabajo", groups: [] }), null);
});
