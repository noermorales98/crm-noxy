import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { DEFAULT_PIPELINES, isValidTimezone, parseOrganizationInput, pickInitialMembership, resolveSwitch, sessionClaimsFor } from "./organizations.ts";

const m = (id: string, organizationId: string, role: string, day: number, permissions: unknown = null) => ({ id, organizationId, role, permissions, createdAt: new Date(2026, 0, day) });

test("create input: trims the name, defaults the timezone, rejects bad values", () => {
  assert.deepEqual(parseOrganizationInput({ name: "  Clínica   Sol " }), { ok: true, value: { name: "Clínica Sol", timezone: "America/Cancun" } });
  assert.deepEqual(parseOrganizationInput({ name: "X", timezone: "America/Mexico_City" }), { ok: true, value: { name: "X", timezone: "America/Mexico_City" } });
  assert.equal(parseOrganizationInput({ name: "   " }).ok, false);
  assert.equal(parseOrganizationInput(null).ok, false);
  assert.equal(parseOrganizationInput({ name: "x".repeat(121) }).ok, false);
  assert.equal(parseOrganizationInput({ name: "X", timezone: "Marte/Olympus" }).ok, false);
  assert.equal(isValidTimezone(42), false);
});

test("initial organization is the oldest membership, whatever order the database returns", () => {
  const a = m("a", "orgA", "OWNER", 1);
  const b = m("b", "orgB", "OWNER", 5);
  assert.equal(pickInitialMembership([b, a])?.organizationId, "orgA");
  assert.equal(pickInitialMembership([a, b])?.organizationId, "orgA");
  assert.equal(pickInitialMembership([]), null);
});

test("switching takes role and permissions from the target membership, not the previous one", () => {
  const owner = m("1", "orgA", "OWNER", 1);
  const member = m("2", "orgB", "MEMBER", 2, { crm: true, mail: false });
  const claims = resolveSwitch([owner, member], "orgB");
  assert.equal(claims?.currentOrganizationId, "orgB");
  assert.equal(claims?.role, "MEMBER");
  assert.equal(claims?.permissions.crm, true);
  assert.equal(claims?.permissions.vault, false);
  assert.equal(sessionClaimsFor(owner).permissions.vault, true);
});

test("switching to an organization I do not belong to is refused", () => {
  const mine = [m("1", "orgA", "OWNER", 1)];
  assert.equal(resolveSwitch(mine, "orgB"), null);
  assert.equal(resolveSwitch(mine, undefined), null);
  assert.equal(resolveSwitch(mine, { $ne: "x" }), null);
  assert.equal(resolveSwitch([], "orgA"), null);
});

test("a new sub-account gets a sales and an editorial pipeline with a Lead stage and a lost stage", () => {
  assert.equal(DEFAULT_PIPELINES.length, 2);
  const sales = DEFAULT_PIPELINES[0];
  assert.ok(sales.stages.some((s: { name: string }) => s.name === "Lead"));
  for (const p of DEFAULT_PIPELINES) assert.ok(p.stages.some((s: { isLost?: boolean }) => s.isLost));
});

test("the session never trusts organization, role or permissions sent by the browser", () => {
  const config = readFileSync(new URL("../../auth.config.ts", import.meta.url), "utf8");
  const update = config.slice(config.indexOf('trigger === "update"'), config.indexOf("return token;"));
  assert.ok(!/token\.(currentOrganizationId|role|permissions)\s*=/.test(update), "auth.config.ts asigna org/rol/permisos desde el cliente");
  const auth = readFileSync(new URL("../../auth.ts", import.meta.url), "utf8");
  assert.match(auth, /resolveSwitch\(memberships, requested\)/);
  assert.match(auth, /pickInitialMembership\(user\.organizations\)/);
});

test("the organizations API requires a session and the switch validates membership", () => {
  for (const f of ["route.ts", "switch/route.ts"]) {
    const src = readFileSync(new URL(`../../app/api/organizations/${f}`, import.meta.url), "utf8");
    assert.match(src, /status: 401/);
  }
  const sw = readFileSync(new URL("../../app/api/organizations/switch/route.ts", import.meta.url), "utf8");
  assert.match(sw, /resolveSwitch\(/);
  assert.match(sw, /status: 403/);
});

// ── Formularios públicos (paso 3): todo cae en la organización dueña del formulario ─────────────────────────
// @ts-expect-error: node --test carga el .ts directo
import { pickNotifyOwner, sameOrg } from "./form-lead.ts";

test("a form link to another organization is ignored, one in the same organization is used", () => {
  assert.equal(sameOrg("A", { organizationId: "B", id: 1 }), null);
  assert.deepEqual(sameOrg("A", { organizationId: "A", id: 1 }), { organizationId: "A", id: 1 });
  assert.equal(sameOrg("A", null), null);
  assert.equal(sameOrg("A", undefined), null);
  assert.equal(sameOrg("A", {}), null);
});

test("with two OWNERs the notified one is the oldest with WhatsApp, in any database order", () => {
  const bot = { phone: "1", apiKey: "k" };
  const me = { id: "me", createdAt: new Date(1), user: { callMeBot: bot } };
  const client = { id: "cli", createdAt: new Date(2), user: { callMeBot: { phone: "2", apiKey: "k2" } } };
  const noBot = { id: "nb", createdAt: new Date(0), user: { callMeBot: null } };
  assert.equal(pickNotifyOwner([client, me])?.id, "me");
  assert.equal(pickNotifyOwner([me, client])?.id, "me");
  assert.equal(pickNotifyOwner([noBot, client, me])?.id, "me", "prefiere quien tiene WhatsApp");
  assert.equal(pickNotifyOwner([noBot])?.id, "nb");
  assert.equal(pickNotifyOwner([]), null);
});

test("the public form submit writes only into form.organizationId and never trusts links to other organizations", () => {
  const src = readFileSync(new URL("../../app/api/public/forms/[id]/submit/route.ts", import.meta.url), "utf8");
  const writes = (src.match(/organizationId: [^,\n}]+/g) ?? []).filter((w) => !/organizationId: true/.test(w));
  assert.ok(writes.length >= 4);
  for (const w of writes) assert.match(w, /organizationId: (orgId|form\.organizationId)\s*$/, `organización inesperada: ${w}`);
  assert.doesNotMatch(src, /apptType\.organizationId/);
  assert.doesNotMatch(src, /form\.(company|welcomeEmail|appointmentType)\b[^;]*smtp/);
  for (const link of ["company", "welcomeEmail", "appointmentType"]) assert.match(src, new RegExp(`const ${link} = sameOrg\\(orgId, form\\.`));
  assert.doesNotMatch(src, /organizationMember\.findFirst\(/, "el dueño no se elige sin orden");
  assert.match(src, /pickNotifyOwner\(/);
});
