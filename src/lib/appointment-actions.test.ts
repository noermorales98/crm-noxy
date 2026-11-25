import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { NOTE_SOURCE_INFO, countBySource, filterNotes, showUnassignedSessions } from "./appointment-actions.ts";

const notes = [{ source: "GRANOLA" as const, id: 1 }, { source: "MANUAL" as const, id: 2 }, { source: "MANUAL" as const, id: 3 }, { source: "NOTION" as const, id: 4 }];

test("countBySource cuenta cada origen", () => {
  assert.deepEqual(countBySource(notes), { GRANOLA: 1, MANUAL: 2, NOTION: 1 });
  assert.deepEqual(countBySource([]), { GRANOLA: 0, MANUAL: 0, NOTION: 0 });
});

test("filterNotes: todas, o solo las de un origen, sin perder el orden", () => {
  assert.equal(filterNotes(notes, "ALL").length, 4);
  assert.deepEqual(filterNotes(notes, "MANUAL").map((n: { id: number }) => n.id), [2, 3]);
  assert.equal(filterNotes(notes, "NOTION").length, 1);
});

test("cada origen tiene su etiqueta y su explicación", () => {
  for (const key of ["GRANOLA", "MANUAL", "NOTION"] as const) {
    assert.ok(NOTE_SOURCE_INFO[key].label && NOTE_SOURCE_INFO[key].hint);
  }
  assert.match(NOTE_SOURCE_INFO.GRANOLA.hint, /Granola/);
});

test("las sesiones sin asignar solo se ofrecen mientras no haya una de Granola vinculada", () => {
  assert.equal(showUnassignedSessions([]), true, "cita nueva, sin notas");
  assert.equal(showUnassignedSessions([{ source: "MANUAL" as const }, { source: "NOTION" as const }]), true, "solo notas a mano o de Notion");
  assert.equal(showUnassignedSessions([{ source: "GRANOLA" as const }]), false);
  assert.equal(showUnassignedSessions(notes), false, "con una de Granola entre otras");
});
