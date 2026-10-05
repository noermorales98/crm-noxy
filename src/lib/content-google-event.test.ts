import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { buildContentEventBody, parseContentClock, utcDateKey } from "./content-client-colors.ts";

const base = {
  id: "item-1",
  date: new Date("2026-10-05T12:00:00.000Z"),
  type: "reel",
  title: "Volver a creer",
  time: null as string | null,
  hook: "¿Y si hoy sí?",
  caption: "Un texto",
  clientId: "client-1",
  clientName: "Ángeles",
  clientColor: "#3545D6",
  timeZone: "America/Cancun",
  crmUrl: "https://crm.example/contenido/client-1",
};

test("parseContentClock reads 12-hour and 24-hour times", () => {
  assert.deepEqual(parseContentClock("11:00 am"), { hours: 11, minutes: 0 });
  assert.deepEqual(parseContentClock("11:00am — pico"), { hours: 11, minutes: 0 });
  assert.deepEqual(parseContentClock("12:30 PM"), { hours: 12, minutes: 30 });
  assert.deepEqual(parseContentClock("12:00 am"), { hours: 0, minutes: 0 });
  assert.deepEqual(parseContentClock("18:15"), { hours: 18, minutes: 15 });
  assert.equal(parseContentClock("sin hora"), null);
  assert.equal(parseContentClock(null), null);
});

test("all-day events use the UTC calendar date", () => {
  const body = buildContentEventBody(base);
  assert.equal(utcDateKey(base.date), "2026-10-05");
  assert.deepEqual(body.start, { date: "2026-10-05" });
  assert.deepEqual(body.end, { date: "2026-10-06" });
  assert.equal(body.summary, "Ángeles — Volver a creer");
  assert.equal(body.colorId, "9");
  assert.match(body.description, /Tipo: Reel/);
  assert.match(body.description, /https:\/\/crm\.example\/contenido\/client-1/);
});

test("timed events last one hour in the organization timezone", () => {
  const body = buildContentEventBody({ ...base, time: "11:00 am" });
  assert.equal("dateTime" in body.start && body.start.dateTime, "2026-10-05T16:00:00.000Z");
  assert.equal("dateTime" in body.end && body.end.dateTime, "2026-10-05T17:00:00.000Z");
  assert.equal("timeZone" in body.start && body.start.timeZone, "America/Cancun");
});
