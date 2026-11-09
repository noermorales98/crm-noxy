import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// La confirmación humana solo vale si la hace alguien con sesión en el CRM: sin ella, quien tenga el enlace
// (incluida la propia IA) podría obtener el approvalToken. /mcp queda fuera del middleware, así que lo exige el propio código.
const root = new URL("../../../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

test("the approval action refuses to confirm without a CRM session", () => {
  const action = read("app/mcp/approve/actions.ts");
  assert.match(action, /from ["']@\/auth["']/);
  assert.match(action, /await auth\(\)/);
  assert.ok(action.indexOf("auth()") < action.indexOf("confirmPreview("), "the session check runs before confirming");
});

test("the approval page sends signed-out visitors to the login and shows the summary only to signed-in users", () => {
  const page = read("app/mcp/approve/[token]/page.tsx");
  assert.match(page, /await auth\(\)/);
  assert.match(page, /redirect\(`\/login\?callbackUrl=/);
});
