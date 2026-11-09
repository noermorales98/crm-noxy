import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { extractNotionDatabaseId, parseNotionConfigInput } from "./notion-config.ts";

const ID = "0b55310f8a1647778c2b191797944413";

test("extractNotionDatabaseId accepts a share link, a bare id or a dashed uuid", () => {
  assert.equal(extractNotionDatabaseId(`https://app.notion.com/p/${ID}?v=d800ae49f1674e4ab4d2f85f5556a06d&source=copy_link`), ID);
  assert.equal(extractNotionDatabaseId(`https://www.notion.so/Mi-base-${ID}?pvs=4`), ID);
  assert.equal(extractNotionDatabaseId(ID.toUpperCase()), ID);
  assert.equal(extractNotionDatabaseId("0b55310f-8a16-4777-8c2b-191797944413"), ID);
  assert.equal(extractNotionDatabaseId("no es un id"), null);
  assert.equal(extractNotionDatabaseId(""), null);
});

test("parseNotionConfigInput requires a token the first time and keeps it afterwards", () => {
  assert.equal(parseNotionConfigInput({ databaseId: ID }, false).ok, false, "first save needs a token");
  assert.deepEqual(parseNotionConfigInput({ token: "  secret_x ", databaseId: ID }, false), { ok: true, value: { token: "secret_x", databaseId: ID } });
  assert.deepEqual(parseNotionConfigInput({ databaseId: ID }, true), { ok: true, value: { token: null, databaseId: ID } });
  assert.equal(parseNotionConfigInput({ token: "t", databaseId: "xx" }, false).ok, false, "invalid database");
});
