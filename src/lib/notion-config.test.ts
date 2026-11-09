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
  assert.deepEqual(parseNotionConfigInput({ token: "  secret_x ", databaseId: ID }, false), { ok: true, value: { token: "secret_x", databaseId: ID, docsDatabaseId: null, autoSyncDeals: null, autoSyncDocs: null } });
  assert.deepEqual(parseNotionConfigInput({ databaseId: ID }, true), { ok: true, value: { token: null, databaseId: ID, docsDatabaseId: null, autoSyncDeals: null, autoSyncDocs: null } });
  assert.equal(parseNotionConfigInput({ token: "t", databaseId: "xx" }, false).ok, false, "invalid database");
});

test("parseNotionConfigInput reads the docs database and the auto-sync switches", () => {
  const DOCS = "11111111222233334444555566667777";
  assert.deepEqual(parseNotionConfigInput({ databaseId: ID, docsDatabaseId: `https://notion.so/Docs-${DOCS}?v=1`, autoSyncDeals: true, autoSyncDocs: false }, true), {
    ok: true,
    value: { token: null, databaseId: ID, docsDatabaseId: DOCS, autoSyncDeals: true, autoSyncDocs: false },
  });
  assert.equal(parseNotionConfigInput({ databaseId: ID, docsDatabaseId: "no es base" }, true).ok, false, "invalid docs database");
  const cleared = parseNotionConfigInput({ databaseId: ID, docsDatabaseId: "" }, true);
  assert.equal(cleared.ok && cleared.value.docsDatabaseId, null, "empty clears it");
});
