import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { greetingFor, dayPart, firstName, summarizeWork } from "./dashboard-greeting.ts";

// Cancún es UTC-5 todo el año: 15:00Z = 10:00 locales.
const at = (iso: string) => new Date(iso);
const base = { name: "Noeli Ramírez", sexo: "FEMENINO" as const, overdueTasks: 0, pendingToday: 0, nextAppointment: null, totalPending: 0 };

test("firstName takes the first word and tolerates empty names", () => {
  assert.equal(firstName("Noeli Ramírez"), "Noeli");
  assert.equal(firstName("  "), "");
  assert.equal(firstName(null), "");
});

test("dayPart follows the local hour in Cancún", () => {
  assert.equal(dayPart(at("2026-11-09T07:00:00Z")), "madrugada"); // 02:00
  assert.equal(dayPart(at("2026-11-09T15:00:00Z")), "manana"); // 10:00
  assert.equal(dayPart(at("2026-11-09T19:30:00Z")), "tarde"); // 14:30
  assert.equal(dayPart(at("2026-11-10T03:00:00Z")), "noche"); // 22:00 del 9
});

test("the headline matches the part of the day and includes the first name", () => {
  const morning = greetingFor({ ...base, now: at("2026-11-09T15:00:00Z") }).headline;
  assert.match(morning, /Noeli/);
  assert.match(morning, /d[ií]a|Arranc|gusto/i);
  const night = greetingFor({ ...base, now: at("2026-11-10T03:00:00Z") }).headline;
  assert.match(night, /noche|Cerrando|Aún/i);
});

test("the same person on the same day always sees the same greeting; another day may differ", () => {
  const a = greetingFor({ ...base, now: at("2026-11-09T15:00:00Z") });
  const b = greetingFor({ ...base, now: at("2026-11-09T16:00:00Z") });
  assert.deepEqual(a, b);
  const days = new Set([9, 10, 11, 12, 13, 14, 15].map((d) => greetingFor({ ...base, now: at(`2026-11-${String(d).padStart(2, "0")}T15:00:00Z`) }).headline));
  assert.ok(days.size > 1, "variation across days");
});

test("the status line follows the state in priority order", () => {
  const now = at("2026-11-09T15:00:00Z");
  assert.match(greetingFor({ ...base, now, overdueTasks: 2, pendingToday: 3 }).status, /2 tareas vencidas/);
  assert.match(greetingFor({ ...base, now, overdueTasks: 1 }).status, /1 tarea vencida/);
  assert.match(greetingFor({ ...base, now, nextAppointment: { inMinutes: 45, title: "Demo" } }).status, /Demo.*45 min/);
  assert.match(greetingFor({ ...base, now, nextAppointment: { inMinutes: 600, title: "Demo" } }).status, /./);
  assert.match(greetingFor({ ...base, now, pendingToday: 3 }).status, /3 tareas para hoy/);
  assert.match(greetingFor({ ...base, now, totalPending: 4 }).status, /4 tareas pendientes/);
  assert.match(greetingFor({ ...base, now }).status, /al d[ií]a|sin pendientes/i);
});

test("an imminent appointment outranks today's tasks but not overdue ones", () => {
  const now = at("2026-11-09T15:00:00Z");
  const appt = { inMinutes: 30, title: "Llamada" };
  assert.match(greetingFor({ ...base, now, pendingToday: 5, nextAppointment: appt }).status, /Llamada/);
  assert.match(greetingFor({ ...base, now, overdueTasks: 1, nextAppointment: appt }).status, /vencida/);
});

test("Monday and Friday add their own touch; no name still reads well", () => {
  const monday = greetingFor({ ...base, now: at("2026-11-09T15:00:00Z"), name: "" });
  assert.doesNotMatch(monday.headline, /undefined|null|,\s*$/);
  const friday = greetingFor({ ...base, now: at("2026-11-13T15:00:00Z") });
  assert.ok(friday.headline.length > 0);
});

test("summarizeWork counts overdue, due-today and pending tasks and finds the next appointment", () => {
  const now = at("2026-11-09T15:00:00Z"); // 10:00 del 9 en Cancún
  const tasks = [
    { dueDate: "2026-11-08T12:00:00Z", isCompleted: false }, // ayer: vencida
    { dueDate: "2026-11-09T22:00:00Z", isCompleted: false }, // hoy 17:00
    { dueDate: "2026-11-12T12:00:00Z", isCompleted: false }, // futura
    { dueDate: null, isCompleted: false }, // sin fecha
    { dueDate: "2026-11-01T12:00:00Z", isCompleted: true }, // completada: no cuenta
  ];
  const appointments = [
    { startTime: "2026-11-09T14:00:00Z", title: "Pasada" }, // ya empezó
    { startTime: "2026-11-09T17:00:00Z", title: "Demo" }, // en 120 min
    { startTime: "2026-11-10T17:00:00Z", title: "Mañana" },
  ];
  const summary = summarizeWork({ now, tasks, appointments });
  assert.equal(summary.overdueTasks, 1);
  assert.equal(summary.pendingToday, 1);
  assert.equal(summary.totalPending, 4);
  assert.deepEqual(summary.nextAppointment, { inMinutes: 120, title: "Demo" });
  assert.equal(summarizeWork({ now, tasks: [], appointments: [] }).nextAppointment, null);
});
