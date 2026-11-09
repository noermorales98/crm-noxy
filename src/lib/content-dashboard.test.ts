import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { summarizeContent, contentGreeting } from "./content-dashboard.ts";

type Item = { id: string; title: string; type: string; publishStatus: string; date: string; time: string | null; clientId: string; clientName: string };
const item = (id: string, date: string, status: string, clientId = "c1"): Item => ({ id, title: `Pieza ${id}`, type: "reel", publishStatus: status, date, time: null, clientId, clientName: clientId === "c1" ? "Alfa" : "Beta" });
const clients = [
  { id: "c1", name: "Alfa", color: "#111111" },
  { id: "c2", name: "Beta", color: "#222222" },
  { id: "c3", name: "Gamma", color: "#333333" },
];
const TODAY = "2026-11-09";

test("counts overdue, due today, ready to upload, in editing, pending and next 7 days; subido never counts", () => {
  const items = [
    item("a", "2026-11-07T00:00:00.000Z", "pendiente"), // atrasada
    item("b", "2026-11-08T00:00:00.000Z", "subido"), // hecha: no cuenta
    item("c", "2026-11-09T00:00:00.000Z", "editado"), // hoy y lista para subir
    item("d", "2026-11-09T00:00:00.000Z", "en_edicion"), // hoy, en edición
    item("e", "2026-11-12T00:00:00.000Z", "pendiente", "c2"), // próxima
    item("f", "2026-11-20T00:00:00.000Z", "pendiente", "c2"), // fuera de la semana
  ];
  const s = summarizeContent(items, clients, TODAY);
  assert.equal(s.overdue.length, 1);
  assert.equal(s.today.length, 2);
  assert.equal(s.counts.toUpload, 1);
  assert.equal(s.counts.inEditing, 1);
  assert.equal(s.counts.pending, 3);
  assert.equal(s.upcoming.map((i: { id: string }) => i.id).join(","), "e");
  assert.equal(s.counts.thisWeek, 3, "hoy (2) + próxima (1)");
});

test("per-client health: overdue first, then due today; clients with nothing scheduled are flagged", () => {
  const items = [item("a", "2026-11-07T00:00:00.000Z", "pendiente", "c2"), item("b", "2026-11-09T00:00:00.000Z", "pendiente", "c1")];
  const s = summarizeContent(items, clients, TODAY);
  assert.deepEqual(s.perClient.map((c: { id: string }) => c.id), ["c2", "c1", "c3"]);
  assert.equal(s.perClient[0].overdue, 1);
  assert.equal(s.perClient[1].today, 1);
  assert.equal(s.perClient[2].idle, true, "Gamma has nothing scheduled");
  assert.equal(s.perClient[0].idle, false);
  assert.equal(s.counts.idleClients, 1);
});

test("today's pieces are ordered by time and overdue ones by oldest date", () => {
  const items = [
    { ...item("b", "2026-11-09T00:00:00.000Z", "pendiente"), time: "11:00 am" },
    { ...item("a", "2026-11-09T00:00:00.000Z", "pendiente"), time: "9:00 am" },
    item("o2", "2026-11-08T00:00:00.000Z", "pendiente"),
    item("o1", "2026-11-05T00:00:00.000Z", "pendiente"),
  ];
  const s = summarizeContent(items, clients, TODAY);
  assert.deepEqual(s.today.map((i: { id: string }) => i.id), ["a", "b"]);
  assert.deepEqual(s.overdue.map((i: { id: string }) => i.id), ["o1", "o2"]);
});

test("contentGreeting reflects the state", () => {
  const empty = summarizeContent([], clients, TODAY);
  assert.match(contentGreeting(empty), /al d[ií]a|sin piezas/i);
  const busy = summarizeContent([item("a", "2026-11-07T00:00:00.000Z", "pendiente"), item("b", "2026-11-09T00:00:00.000Z", "pendiente")], clients, TODAY);
  assert.match(contentGreeting(busy), /1 pieza atrasada/);
  const onlyToday = summarizeContent([item("b", "2026-11-09T00:00:00.000Z", "pendiente"), item("c", "2026-11-09T00:00:00.000Z", "pendiente")], clients, TODAY);
  assert.match(contentGreeting(onlyToday), /2 piezas para hoy/);
});
