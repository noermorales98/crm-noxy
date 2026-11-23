import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { fallbackDigestMessage, isDigestDue, nextDigestRun, shouldNotifyDigestError } from "./digest-schedule.ts";

const daily = { enabled: true, frequency: "daily" as const, customDays: [], weeklyDay: 1, monthlyDay: 1, hour: 8, minute: 0 };
const TZ = "America/Cancun"; // UTC-5 fijo

test("isDigestDue: solo dentro de la ventana y una vez al día", () => {
  assert.equal(isDigestDue(daily, TZ, new Date("2026-11-23T13:05:00Z")), true); // 08:05 local
  assert.equal(isDigestDue(daily, TZ, new Date("2026-11-23T13:20:00Z")), false); // 08:20, fuera de ventana
  assert.equal(isDigestDue({ ...daily, lastSentAt: new Date("2026-11-23T13:01:00Z") }, TZ, new Date("2026-11-23T13:10:00Z")), false);
});

test("nextDigestRun: hoy si aún no llega la hora, mañana si ya pasó o ya se envió", () => {
  const before = nextDigestRun(daily, TZ, new Date("2026-11-23T11:00:00Z")); // 06:00 local
  assert.deepEqual(before, { date: "2026-11-23", time: "08:00", dueNow: false });

  const after = nextDigestRun(daily, TZ, new Date("2026-11-23T20:00:00Z")); // 15:00 local
  assert.deepEqual(after, { date: "2026-11-24", time: "08:00", dueNow: false });

  const sentToday = nextDigestRun({ ...daily, lastSentAt: new Date("2026-11-23T13:01:00Z") }, TZ, new Date("2026-11-23T13:03:00Z"));
  assert.equal(sentToday?.date, "2026-11-24");
});

test("nextDigestRun: dueNow dentro de la ventana, null si está apagado y respeta el día semanal", () => {
  assert.equal(nextDigestRun(daily, TZ, new Date("2026-11-23T13:05:00Z"))?.dueNow, true);
  assert.equal(nextDigestRun({ ...daily, enabled: false }, TZ, new Date("2026-11-23T11:00:00Z")), null);
  // 2026-11-23 es lunes; weeklyDay 5 = viernes
  const weekly = nextDigestRun({ ...daily, frequency: "weekly", weeklyDay: 5 }, TZ, new Date("2026-11-23T11:00:00Z"));
  assert.equal(weekly?.date, "2026-11-27");
});

test("fallbackDigestMessage: limpia líneas vacías dobles y recorta a 1500 caracteres", () => {
  const short = fallbackDigestMessage("A\n\n\n\nB  \n");
  assert.equal(short, "A\n\nB");
  const long = fallbackDigestMessage(Array.from({ length: 200 }, (_, i) => `linea ${i} con texto de relleno`).join("\n"));
  assert.ok(long.length <= 1500);
  assert.ok(long.endsWith("(resumen recortado)"));
});

test("shouldNotifyDigestError: avisa la primera vez y luego espera la ventana de silencio", () => {
  const now = new Date("2026-11-23T12:00:00Z");
  assert.equal(shouldNotifyDigestError(null, now), true);
  assert.equal(shouldNotifyDigestError(new Date("2026-11-23T10:00:00Z"), now), false);
  assert.equal(shouldNotifyDigestError(new Date("2026-11-23T05:00:00Z"), now), true);
});
