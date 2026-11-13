import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { buildManualAppointment, resolveTimezone, zonedDateTimeToUtc } from "./manual-appointment.ts";

test("zonedDateTimeToUtc reads the date and time in the organisation's time zone", () => {
  // Cancún no cambia de horario: UTC-5 todo el año.
  assert.equal(zonedDateTimeToUtc("2026-11-20", "10:30", "America/Cancun")?.toISOString(), "2026-11-20T15:30:00.000Z");
  // Ciudad de México en verano (UTC-6) y con otra zona.
  assert.equal(zonedDateTimeToUtc("2026-07-01", "09:00", "America/Mexico_City")?.toISOString(), "2026-07-01T15:00:00.000Z");
  assert.equal(zonedDateTimeToUtc("2026-01-15", "00:00", "UTC")?.toISOString(), "2026-01-15T00:00:00.000Z");
  assert.equal(zonedDateTimeToUtc("20-11-2026", "10:30", "UTC"), null, "bad date");
  assert.equal(zonedDateTimeToUtc("2026-11-20", "25:99", "UTC"), null, "bad time");
  assert.equal(zonedDateTimeToUtc("2026-11-20", "10:30", "No/Zone")?.toISOString(), "2026-11-20T10:30:00.000Z", "unknown zone falls back to UTC");
});

const type = { id: "t1", duration: 30 };

test("buildManualAppointment validates the required fields", () => {
  const ok = { date: "2026-11-20", time: "10:30", guestName: "Ana Pérez" };
  assert.equal(buildManualAppointment({ ...ok, guestName: "  " }, type, "UTC").ok, false, "name required");
  assert.equal(buildManualAppointment({ ...ok, date: "" }, type, "UTC").ok, false, "date required");
  assert.equal(buildManualAppointment({ ...ok, time: "" }, type, "UTC").ok, false, "time required");
  assert.equal(buildManualAppointment({ ...ok, durationMinutes: 2 }, type, "UTC").ok, false, "duration too short");
  assert.equal(buildManualAppointment({ ...ok, durationMinutes: 5000 }, type, "UTC").ok, false, "duration too long");
  assert.equal(buildManualAppointment({ ...ok, guestEmail: "no-es-correo" }, type, "UTC").ok, false, "bad email");
});

test("buildManualAppointment uses the type's duration by default and trims the guest", () => {
  const built = buildManualAppointment(
    { date: "2026-11-20", time: "10:30", guestName: "  Ana Pérez ", guestEmail: " ana@x.com ", guestPhone: " 555 ", notes: "  Llevar contrato " },
    type,
    "UTC",
  );
  assert.equal(built.ok, true);
  assert.equal(built.value.startTime.toISOString(), "2026-11-20T10:30:00.000Z");
  assert.equal(built.value.endTime.toISOString(), "2026-11-20T11:00:00.000Z");
  assert.equal(built.value.guestName, "Ana Pérez");
  assert.equal(built.value.guestEmail, "ana@x.com");
  assert.equal(built.value.guestPhone, "555");
  assert.equal(built.value.notes, "Llevar contrato");
  const custom = buildManualAppointment({ date: "2026-11-20", time: "10:30", guestName: "Ana", durationMinutes: 90 }, type, "UTC");
  assert.equal(custom.value?.endTime.toISOString(), "2026-11-20T12:00:00.000Z");
  assert.equal(custom.value?.guestEmail, "", "email is optional and stored empty");
});

test("an appointment without a type needs a title and defaults to one hour", () => {
  const base = { date: "2026-11-20", time: "10:30", guestName: "Ana" };
  assert.equal(buildManualAppointment(base, null, "UTC").ok, false, "title required without a type");
  assert.equal(buildManualAppointment({ ...base, title: "   " }, null, "UTC").ok, false, "blank title is not a title");
  const built = buildManualAppointment({ ...base, title: "  Comida con proveedor ", notes: " Llevar contrato " }, null, "UTC");
  assert.equal(built.ok, true);
  assert.equal(built.value?.title, "Comida con proveedor");
  assert.equal(built.value?.notes, "Llevar contrato");
  assert.equal(built.value?.endTime.toISOString(), "2026-11-20T11:30:00.000Z", "one hour by default");
});

test("with a type the title is optional and the guest name is optional when there is a title", () => {
  const withType = buildManualAppointment({ date: "2026-11-20", time: "10:30", guestName: "Ana" }, { duration: 30 }, "UTC");
  assert.equal(withType.ok, true);
  assert.equal(withType.value?.title, null);
  const noGuest = buildManualAppointment({ date: "2026-11-20", time: "10:30", title: "Bloqueo personal" }, null, "UTC");
  assert.equal(noGuest.ok, true, "a reserved block does not need a person");
  assert.equal(noGuest.value?.guestName, "Bloqueo personal", "the title stands in for the guest name");
});

test("resolveTimezone trusts a valid browser zone and falls back otherwise", () => {
  assert.equal(resolveTimezone("America/Cancun", "UTC"), "America/Cancun");
  assert.equal(resolveTimezone("  Europe/Madrid ", "UTC"), "Europe/Madrid");
  assert.equal(resolveTimezone("No/Zone", "America/Cancun"), "America/Cancun");
  assert.equal(resolveTimezone("", "America/Cancun"), "America/Cancun");
  assert.equal(resolveTimezone(undefined, "America/Cancun"), "America/Cancun");
  assert.equal(resolveTimezone(42, "America/Cancun"), "America/Cancun");
});
