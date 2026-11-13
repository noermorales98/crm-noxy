import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { appointmentTabCounts, filterAppointments, groupAppointmentsByDay } from "./appointment-groups.ts";
// @ts-expect-error: node --test carga el .ts directo
import { utcToZonedParts, zonedDateTimeToUtc } from "./manual-appointment.ts";

const at = (iso: string, status = "CONFIRMED", minutes = 30) => ({
  id: iso + status,
  status,
  startTime: iso,
  endTime: new Date(new Date(iso).getTime() + minutes * 60000).toISOString(),
});
// «Ahora»: 15 nov 2026, 12:00 en Cancún (UTC-5) = 17:00 UTC
const NOW = new Date("2026-11-15T17:00:00Z");
const TZ = "America/Cancun";

test("utcToZonedParts is the inverse of zonedDateTimeToUtc", () => {
  const utc = zonedDateTimeToUtc("2026-11-20", "10:30", TZ);
  assert.deepEqual(utcToZonedParts(utc as Date, TZ), { date: "2026-11-20", time: "10:30" });
  assert.deepEqual(utcToZonedParts(new Date("2026-11-15T04:30:00Z"), TZ), { date: "2026-11-14", time: "23:30" }, "the local day, not the UTC day");
  assert.deepEqual(utcToZonedParts(new Date("2026-01-01T00:00:00Z"), "UTC"), { date: "2026-01-01", time: "00:00" });
  assert.deepEqual(utcToZonedParts(new Date("2026-03-01T12:00:00Z"), "No/Zone"), { date: "2026-03-01", time: "12:00" }, "unknown zone falls back to UTC");
});

const rows = [
  at("2026-11-14T15:00:00Z"), // ayer, ya pasó, sin completar
  at("2026-11-15T18:00:00Z"), // hoy, falta
  at("2026-11-15T14:00:00Z"), // hoy, ya pasó
  at("2026-11-16T15:00:00Z"), // mañana
  at("2026-11-20T15:00:00Z"), // más adelante
  at("2026-11-10T15:00:00Z", "COMPLETED"),
  at("2026-11-18T15:00:00Z", "CANCELLED"),
];

test("filterAppointments separates upcoming, past and cancelled", () => {
  assert.equal(filterAppointments(rows, "upcoming", NOW).length, 3, "confirmed and not over yet");
  assert.equal(filterAppointments(rows, "past", NOW).length, 3, "over, or completed; never cancelled");
  assert.equal(filterAppointments(rows, "cancelled", NOW).length, 1);
  assert.equal(filterAppointments(rows, "all", NOW).length, 7);
  assert.deepEqual(appointmentTabCounts(rows, NOW), { upcoming: 3, past: 3, cancelled: 1, all: 7 });
});

test("upcoming is ordered soonest first and past most recent first", () => {
  const upcoming = filterAppointments(rows, "upcoming", NOW).map((r: { startTime: string }) => r.startTime);
  assert.deepEqual(upcoming, ["2026-11-15T18:00:00Z", "2026-11-16T15:00:00Z", "2026-11-20T15:00:00Z"]);
  const past = filterAppointments(rows, "past", NOW).map((r: { startTime: string }) => r.startTime);
  assert.deepEqual(past, ["2026-11-15T14:00:00Z", "2026-11-14T15:00:00Z", "2026-11-10T15:00:00Z"]);
});

test("groupAppointmentsByDay labels Hoy, Mañana and Ayer in the organisation's time zone", () => {
  const groups = groupAppointmentsByDay(filterAppointments(rows, "upcoming", NOW), TZ, NOW, "asc");
  assert.deepEqual(groups.map((g: { label: string }) => g.label), ["Hoy", "Mañana", "vie, 20 nov"]);
  assert.equal(groups[0].items.length, 1);
  const past = groupAppointmentsByDay(filterAppointments(rows, "past", NOW), TZ, NOW, "desc");
  assert.deepEqual(past.map((g: { label: string }) => g.label), ["Hoy", "Ayer", "mar, 10 nov"]);
});

test("a late-evening appointment belongs to its local day, not to the UTC day", () => {
  // 23:30 en Cancún del 15 de nov = 04:30 UTC del 16
  const groups = groupAppointmentsByDay([at("2026-11-16T04:30:00Z")], TZ, NOW, "asc");
  assert.equal(groups[0].label, "Hoy");
});
