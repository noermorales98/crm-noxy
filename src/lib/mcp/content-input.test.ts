import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { CONTENT_TYPES, buildItemCreateData, buildItemUpdateData, monthRange, parseItemDate } from "./content-input.ts";

test("parseItemDate pins a bare day at noon UTC and rejects garbage", () => {
  assert.equal(parseItemDate("2026-08-15")?.toISOString(), "2026-08-15T12:00:00.000Z");
  assert.equal(parseItemDate("2026-08-15T09:30:00Z")?.toISOString(), "2026-08-15T09:30:00.000Z");
  assert.equal(parseItemDate("mañana"), null);
  assert.equal(parseItemDate(""), null);
  assert.equal(parseItemDate(undefined), null);
});

test("monthRange covers the whole calendar month in UTC", () => {
  const range = monthRange("2026-02");
  assert.equal(range?.from.toISOString(), "2026-02-01T00:00:00.000Z");
  assert.equal(range?.to.toISOString(), "2026-03-01T00:00:00.000Z");
  assert.equal(monthRange("2026-13") === null || monthRange("2026-13")?.from.getUTCMonth() === 0, true);
  assert.equal(monthRange("febrero"), null);
});

test("buildItemCreateData validates the required fields and falls back on unknown values", () => {
  assert.equal(buildItemCreateData({ title: "  ", date: "2026-08-15" }, 1).ok, false, "title required");
  assert.equal(buildItemCreateData({ title: "Reel", date: "x" }, 1).ok, false, "valid date required");
  const built = buildItemCreateData({ title: " Reel ", date: "2026-08-15", type: "podcast", publishStatus: "listo", hooksAlt: ["a", " ", "b"] }, 2);
  assert.equal(built.ok, true);
  assert.equal(built.data.title, "Reel");
  assert.equal(built.data.type, "video", "unknown type falls back to video");
  assert.equal(built.data.publishStatus, "editado", "legacy 'listo' maps to editado");
  assert.equal(built.data.hooksAlt, JSON.stringify(["a", "b"]));
  assert.equal(built.data.reminderDaysBefore, 2, "defaults to the client's reminder");
  assert.deepEqual(CONTENT_TYPES, ["video", "reel", "flyer", "historia", "entrega", "edicion"]);
});

test("buildItemUpdateData only touches the fields that were sent", () => {
  const before = { publishStatus: "pendiente", uploadedAt: null, reminderDaysBefore: 1 };
  assert.deepEqual(buildItemUpdateData({}, before), {});
  const data = buildItemUpdateData({ title: " Nuevo ", caption: null, publishStatus: "subido", type: "reel" }, before);
  assert.equal(data.title, "Nuevo");
  assert.equal(data.caption, null);
  assert.equal(data.type, "reel");
  assert.equal(data.publishStatus, "subido");
  assert.ok(data.uploadedAt instanceof Date, "subido stamps uploadedAt");
  const back = buildItemUpdateData({ publishStatus: "pendiente" }, { publishStatus: "subido", uploadedAt: new Date(), reminderDaysBefore: 1 });
  assert.equal(back.uploadedAt, null, "leaving subido clears uploadedAt");
  assert.equal("title" in buildItemUpdateData({ title: "  " }, before), false, "blank title ignored");
});
