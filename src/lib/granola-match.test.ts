import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { matchNoteToAppointment, mergeActionItems } from "./granola-match.ts";

const at = (iso: string) => new Date(iso);
const note = (iso: string | null, ...emails: string[]) => ({ startedAt: iso ? at(iso) : null, attendees: emails.map((email) => ({ name: null, email })) });
const appt = (id: string, iso: string, guestEmail: string | null, contactEmail?: string) => ({ id, startTime: at(iso), guestEmail, contactEmail });

test("una sola candidata por horario y correo → se asigna", () => {
  const id = matchNoteToAppointment(note("2026-11-06T16:05:00Z", "ana@acme.com"), [appt("a1", "2026-11-06T16:00:00Z", "Ana@Acme.com"), appt("a2", "2026-11-06T20:00:00Z", "ana@acme.com")]);
  assert.equal(id, "a1");
});

test("también coincide por el correo del contacto de la cita", () => {
  assert.equal(matchNoteToAppointment(note("2026-11-06T16:00:00Z", "c@c.com"), [appt("a1", "2026-11-06T16:00:00Z", "otro@x.com", "C@c.com")]), "a1");
});

test("dos candidatas → sin asignar", () => {
  assert.equal(matchNoteToAppointment(note("2026-11-06T16:00:00Z", "ana@acme.com"), [appt("a1", "2026-11-06T16:00:00Z", "ana@acme.com"), appt("a2", "2026-11-06T16:10:00Z", "ana@acme.com")]), null);
});

test("fuera de la tolerancia o sin correo en común → sin asignar", () => {
  assert.equal(matchNoteToAppointment(note("2026-11-06T16:00:00Z", "ana@acme.com"), [appt("a1", "2026-11-06T16:16:00Z", "ana@acme.com")]), null);
  assert.equal(matchNoteToAppointment(note("2026-11-06T16:00:00Z", "ana@acme.com"), [appt("a1", "2026-11-06T16:00:00Z", "otra@acme.com")]), null);
});

test("sin hora o sin asistentes → sin asignar", () => {
  assert.equal(matchNoteToAppointment(note(null, "ana@acme.com"), [appt("a1", "2026-11-06T16:00:00Z", "ana@acme.com")]), null);
  assert.equal(matchNoteToAppointment(note("2026-11-06T16:00:00Z"), [appt("a1", "2026-11-06T16:00:00Z", "")]), null);
});

test("mezcla de pasos: conserva convertidos, quita pendientes viejos, agrega nuevos", () => {
  const stored = [
    { id: "i1", text: "Enviar propuesta", taskId: "t1" },
    { id: "i2", text: "Llamar a Luis", taskId: null },
    { id: "i3", text: "Agendar demo", taskId: null },
  ];
  const { create, removeIds } = mergeActionItems(stored, ["enviar  propuesta", "Agendar demo", "Pedir logo"]);
  assert.deepEqual(create, ["Pedir logo"]);
  assert.deepEqual(removeIds, ["i2"]);
});

test("un paso convertido que ya no aparece en el resumen se conserva", () => {
  const { create, removeIds } = mergeActionItems([{ id: "i1", text: "Viejo", taskId: "t9" }], []);
  assert.deepEqual(create, []);
  assert.deepEqual(removeIds, []);
});

test("el borde de la tolerancia: 15 min exactos entran, 15 min y 1 s no", () => {
  const n = note("2026-11-06T16:00:00Z", "ana@acme.com");
  assert.equal(matchNoteToAppointment(n, [appt("a1", "2026-11-06T16:15:00Z", "ana@acme.com")]), "a1");
  assert.equal(matchNoteToAppointment(n, [appt("a1", "2026-11-06T15:45:00Z", "ana@acme.com")]), "a1");
  assert.equal(matchNoteToAppointment(n, [appt("a1", "2026-11-06T16:15:01Z", "ana@acme.com")]), null);
});
