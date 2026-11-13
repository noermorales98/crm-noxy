import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { busyAppointmentsWhere } from "./appointment-busy.ts";

test("a schedule's busy time includes its own appointments and every appointment without a type", () => {
  const where = busyAppointmentsWhere({ organizationId: "org1", scheduleId: "sch1" });
  assert.deepEqual(where, {
    OR: [{ appointmentType: { scheduleId: "sch1" } }, { appointmentTypeId: null, organizationId: "org1" }],
  });
});

test("a single appointment type's busy time includes that type and every appointment without a type", () => {
  const where = busyAppointmentsWhere({ organizationId: "org1", appointmentTypeId: "t1" });
  assert.deepEqual(where, {
    OR: [{ appointmentTypeId: "t1" }, { appointmentTypeId: null, organizationId: "org1" }],
  });
});

test("an appointment without a type is scoped to its own organisation, never to another one", () => {
  const clauses = busyAppointmentsWhere({ organizationId: "orgX", scheduleId: "s" }).OR as Record<string, unknown>[];
  const typeless = clauses.find((clause) => clause.appointmentTypeId === null);
  assert.equal(typeless?.organizationId, "orgX");
});
