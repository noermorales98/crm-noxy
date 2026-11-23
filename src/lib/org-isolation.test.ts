import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { ORG_REF_MODELS, assertOrgRefs } from "./org-refs.ts";

// Aislamiento entre organizaciones: un usuario de la org A no lee ni escribe datos de la org B.
// Parte con base simulada (comportamiento) y parte revisa el código de las rutas (contrato), porque las rutas
// necesitan sesión y base de datos reales para ejecutarse.

const ROOT = new URL("../../", import.meta.url).pathname;
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
function routes(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${name}`;
    if (statSync(join(ROOT, rel)).isDirectory()) out.push(...routes(rel));
    else if (name === "route.ts") out.push(rel);
  }
  return out;
}

/** Base simulada: cada registro vive en una organización. */
function fakeDb(rows: Record<string, { id: string; organizationId: string }[]>) {
  const db: Record<string, { count(a: { where: { id: string; organizationId: string } }): Promise<number> }> = {};
  for (const model of new Set(Object.values(ORG_REF_MODELS) as string[])) {
    db[model] = { count: async ({ where }) => (rows[model] ?? []).filter((r) => r.id === where.id && r.organizationId === where.organizationId).length };
  }
  return db;
}
const DB = fakeDb({
  contact: [{ id: "contactA", organizationId: "A" }, { id: "contactB", organizationId: "B" }],
  company: [{ id: "companyB", organizationId: "B" }],
  deal: [{ id: "dealB", organizationId: "B" }],
  project: [{ id: "projectB", organizationId: "B" }],
});

test("a user of org A cannot link records of org B, for every linkable field", async () => {
  for (const [field, model] of Object.entries(ORG_REF_MODELS) as [string, string][]) {
    const db = fakeDb({ [model]: [{ id: "ajeno", organizationId: "B" }, { id: "propio", organizationId: "A" }] });
    assert.match((await assertOrgRefs(db, "A", { [field]: "ajeno" })) ?? "", new RegExp(field), `${field}: debe rechazar un id de otra org`);
    assert.equal(await assertOrgRefs(db, "A", { [field]: "propio" }), null, `${field}: debe aceptar un id propio`);
    assert.equal(await assertOrgRefs(db, "B", { [field]: "ajeno" }), null);
  }
});

test("empty links mean 'no link'; a non-string id and an id that does not exist are refused", async () => {
  assert.equal(await assertOrgRefs(DB, "A", { contactId: null, companyId: "", dealId: undefined }), null);
  assert.match((await assertOrgRefs(DB, "A", { contactId: { $ne: "x" } })) ?? "", /contactId/);
  assert.match((await assertOrgRefs(DB, "A", { contactId: ["contactA"] })) ?? "", /contactId/);
  assert.match((await assertOrgRefs(DB, "A", { contactId: "no-existe" })) ?? "", /contactId/);
  // mezcla: el primer campo ajeno gana aunque el resto sea propio
  assert.match((await assertOrgRefs(DB, "A", { contactId: "contactA", companyId: "companyB" })) ?? "", /companyId/);
});

test("the error never reveals whether the foreign record exists", async () => {
  const foreign = await assertOrgRefs(DB, "A", { contactId: "contactB" });
  const missing = await assertOrgRefs(DB, "A", { contactId: "no-existe" });
  assert.equal(foreign, missing);
});

// Rutas que aceptan ids del cuerpo: cada una debe pasarlos por assertOrgRefs con estos campos.
const GUARDED: [string, string[]][] = [
  ["app/api/deals/route.ts", ["contactId, companyId", "contactId"]],
  ["app/api/tasks/route.ts", ["dealId, contactId, projectId, companyId, formId, appointmentId"]],
  ["app/api/forms/[id]/route.ts", ["welcomeEmailId, appointmentTypeId"]],
  ["app/api/clients/[id]/route.ts", ["companyId: body.companyId, contactId: body.contactId"]],
  ["app/api/quotes/[id]/route.ts", ["dealId"]],
  ["app/api/projects/route.ts", ["companyId, contactId, clientId, emailAccountCompanyId"]],
  ["app/api/projects/[id]/route.ts", ["companyId: data.companyId, contactId: data.contactId, clientId: data.clientId, emailAccountCompanyId: data.emailAccountCompanyId"]],
  ["app/api/appointment-types/route.ts", ["companyId, scheduleId"]],
  ["app/api/appointment-types/[id]/route.ts", ["companyId, scheduleId"]],
  ["app/api/task-categories/route.ts", ["companyId"]],
  ["app/api/task-categories/[id]/route.ts", ["companyId"]],
];
test("routes that take ids from the request body validate them against the active organization", () => {
  for (const [file, groups] of GUARDED) {
    const src = read(file);
    assert.match(src, /import \{ assertOrgRefs \} from "@\/src\/lib\/org-refs"/, `${file}: falta el import`);
    for (const g of groups) {
      assert.ok(src.includes(`assertOrgRefs(prisma as never, `) && src.includes(`{ ${g} }`), `${file}: no valida { ${g} }`);
    }
    // la validación va ANTES de escribir
    const guard = src.indexOf("assertOrgRefs(prisma");
    const write = src.search(/prisma\.\w+\.(create|update|updateMany)\(/);
    assert.ok(guard > -1 && (write === -1 || guard < write || src.indexOf("assertOrgRefs(prisma", write) > -1), `${file}: valida después de escribir`);
  }
});

test("every handler in deals, contacts, forms and quotes scopes by the session organization", () => {
  // Excepción documentada: forms/[id]/leads es una API pública por token que el dueño del formulario activa a propósito.
  const PUBLIC_BY_DESIGN = new Set(["app/api/forms/[id]/leads/route.ts"]);
  const bad: string[] = [];
  for (const dir of ["app/api/deals", "app/api/contacts", "app/api/forms", "app/api/quotes"]) {
    for (const file of routes(dir)) {
      if (PUBLIC_BY_DESIGN.has(file)) continue;
      const src = read(file);
      const parts = src.split(/(?=export async function (?:GET|POST|PATCH|PUT|DELETE)\b)/).slice(1);
      for (const part of parts) {
        const name = part.match(/export async function (\w+)/)![1];
        const own = /currentOrganizationId|organizationId|organizationOf|scope\./.test(part);
        // o delega en un helper local de la misma ruta (p. ej. loadSendContext) que sí filtra por organización
        const helper = part.match(/await (load\w+)\(/)?.[1];
        const delegated = helper ? new RegExp(`function ${helper}[\\s\\S]*?organizationId`).test(src) : false;
        if (!own && !delegated) bad.push(`${file} ${name}`);
      }
    }
  }
  assert.deepEqual(bad, []);
});

test("no handler in deals, contacts, forms or quotes reads or deletes a record by bare id without an organization check", () => {
  const bad: string[] = [];
  for (const dir of ["app/api/deals", "app/api/contacts", "app/api/forms", "app/api/quotes"]) {
    for (const file of routes(dir)) {
      if (file.includes("/leads/")) continue;
      const lines = read(file).split("\n");
      lines.forEach((line, i) => {
        if (!/prisma\.\w+\.(findUnique|delete|update)\(\{ *where: *\{ *id[ ,:}]/.test(line)) return;
        const window = lines.slice(Math.max(0, i - 25), i + 8).join("\n");
        if (!/organizationId/.test(window)) bad.push(`${file}:${i + 1}`);
      });
    }
  }
  assert.deepEqual(bad, []);
});

test("MCP: every update or delete of an organization record is preceded by an ownership check", () => {
  const bad: string[] = [];
  for (const file of ["src/lib/mcp/tools.ts", "src/lib/mcp/content-tools.ts"]) {
    const lines = read(file).split("\n");
    lines.forEach((line, i) => {
      if (!/prisma\.\w+\.(update|delete)\(/.test(line)) return;
      if (/prisma\.(user|digestSchedule|aiConversation)\./.test(line)) return;
      const before = lines.slice(Math.max(0, i - 25), i).join("\n");
      if (!/owns\(|organizationId: org|organizationId/.test(before)) bad.push(`${file}:${i + 1}`);
    });
  }
  assert.deepEqual(bad, []);
  assert.match(read("src/lib/mcp/tools.ts"), /export function registerCrmTools\(server: McpServer, organizationId: string\)/, "las herramientas se registran por organización");
});

test("MCP default assignee is deterministic (oldest OWNER)", () => {
  const src = read("src/lib/mcp/tools.ts");
  const block = src.slice(src.indexOf("async function defaultUserId"), src.indexOf("return member?.userId"));
  assert.equal((block.match(/orderBy: \[\{ createdAt: "asc" \}, \{ id: "asc" \}\]/g) ?? []).length, 2);
});
