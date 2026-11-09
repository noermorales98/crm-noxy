import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { parseIntegrationInput, redactIntegration } from "./mcp-connections.ts";

test("parseIntegrationInput validates the name, url and transport", () => {
  assert.deepEqual(parseIntegrationInput({ name: "  Notion  ", url: "https://mcp.notion.com/mcp", transport: "http" }), {
    ok: true,
    value: { name: "Notion", url: "https://mcp.notion.com/mcp", transport: "http", authToken: null, note: null, category: null },
  });
  assert.equal(parseIntegrationInput({ name: "" }).ok, false, "name required");
  assert.equal(parseIntegrationInput({ name: "x".repeat(81) }).ok, false, "name too long");
  assert.equal(parseIntegrationInput({ name: "A", url: "ftp://x" }).ok, false, "only http(s) urls");
  assert.equal(parseIntegrationInput({ name: "A", url: "no es url" }).ok, false);
  assert.equal(parseIntegrationInput({ name: "A", transport: "carrier-pigeon" }).ok, false, "unknown transport");
  const stdio = parseIntegrationInput({ name: "Local", transport: "stdio", note: "npx server" });
  assert.equal(stdio.ok, true, "a stdio connection needs no url");
  assert.equal(parseIntegrationInput({ name: "A", authToken: "  tok " }).value?.authToken, "tok");
});

test("redactIntegration never exposes the token, only whether there is one", () => {
  const view = redactIntegration({ id: "1", name: "A", url: null, transport: "http", authToken: "v1:x:y:z", enabled: true, source: "manual", category: null, note: null, createdAt: new Date(0), updatedAt: new Date(0), organizationId: "o" });
  assert.equal("authToken" in view, false);
  assert.equal(view.hasToken, true);
  assert.equal("organizationId" in view, false);
});
