import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires an explicit extension.
import { leadToNotionProperties } from "./notion-map.ts";

test("el deal se mapea a las propiedades fijas de Notion", () => {
  const properties = leadToNotionProperties({
    title: "Sitio web",
    email: " ada@noxy.co ",
    phone: "",
    value: 0,
    stage: "Propuesta",
    source: "LINKEDIN",
    dealId: "deal-1",
  });

  assert.deepEqual(properties.Name, { title: [{ text: { content: "Sitio web" } }] });
  assert.deepEqual(properties.Email, { email: "ada@noxy.co" });
  assert.equal(properties.Phone, undefined);
  assert.deepEqual(properties.Value, { number: 0 });
  assert.deepEqual(properties.Stage, { rich_text: [{ text: { content: "Propuesta" } }] });
  assert.deepEqual(properties.Source, { rich_text: [{ text: { content: "LINKEDIN" } }] });
  assert.deepEqual(properties["CRM Deal ID"], { rich_text: [{ text: { content: "deal-1" } }] });
});

test("docToNotionProperties sets the title and the CRM doc id", async () => {
  // @ts-expect-error: node --test carga el .ts directo
  const { docToNotionProperties } = await import("./notion-map.ts");
  assert.deepEqual(docToNotionProperties({ title: "  ", docId: "abc" }), {
    Name: { title: [{ text: { content: "Sin título" } }] },
    "CRM Doc ID": { rich_text: [{ text: { content: "abc" } }] },
  });
});
