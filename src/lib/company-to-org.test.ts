import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
// @ts-expect-error: node --test carga el .ts directo
import { contactCopyData, contactIdsToCopy, dealCopyData, formCopyData, planPipelines } from "./company-to-org.ts";

const stage = (id: string, name: string, order: number, extra = {}) => ({ id, name, order, color: "#000", isWon: false, isLost: false, ...extra });

test("pipelines match by name (ignoring accents and case) and anything missing is marked to create", () => {
  const src = [{ id: "p1", name: "Ventas", createdAt: new Date(), stages: [stage("s1", "Lead", 1), stage("s2", "Cotización", 2), stage("s3", "Cerrado raro", 3)] }, { id: "p2", name: "Otro", createdAt: new Date(), stages: [stage("s4", "A", 1)] }];
  const dst = [{ id: "d1", name: "ventas", stages: [{ id: "x1", name: "lead" }, { id: "x2", name: "Cotizacion" }] }];
  const plan = planPipelines(src, dst);
  assert.equal(plan[0].targetId, "d1");
  assert.deepEqual(plan[0].stages.map((s: { targetId: string | null }) => s.targetId), ["x1", "x2", null]);
  assert.equal(plan[1].targetId, null);
  assert.equal(plan[1].stages[0].targetId, null);
});

test("contacts to copy: the company's plus those of its deals, once each", () => {
  assert.deepEqual(contactIdsToCopy(["a", "b"], ["b", "c", null]).sort(), ["a", "b", "c"]);
});

test("copied contacts point at the new company and remapped forms; unknown forms become null", () => {
  const out = contactCopyData(
    { firstName: "Ana", lastName: null, email: "a@x.com", phone: null, source: "Form: X", sourceFormId: "f1", sourceVariantId: "v9" },
    { organizationId: "NEW", companyId: "NC", formMap: new Map([["f1", "F1"]]), variantMap: new Map() },
  );
  assert.equal(out.organizationId, "NEW");
  assert.equal(out.companyId, "NC");
  assert.equal(out.sourceFormId, "F1");
  assert.equal(out.sourceVariantId, null);
});

const deal = { title: "T", value: 10, currency: "USD", source: null, lostReason: null, probability: 50, notes: null, icon: null, allowedBookingTypes: '["old-type"]', isArchived: true, archivedAt: new Date(1), wonAt: new Date(2), createdAt: new Date(3), contactId: "c1", referredByContactId: "cX" };

test("a copied deal keeps its history but drops tokens, Notion link, follow-up and foreign references", () => {
  const out = dealCopyData({ ...deal, bookingToken: "tok", notionPageId: "n", followUpAt: new Date(), followUpNotifiedAt: new Date(), referredByClientId: "cl" }, { organizationId: "NEW", companyId: "NC", stageId: "S", pipelineId: "P", contactMap: new Map([["c1", "C1"]]) });
  assert.equal(out.organizationId, "NEW");
  assert.equal(out.contactId, "C1");
  assert.equal(out.referredByContactId, null); // el contacto que refirió no se copió
  assert.equal(out.isArchived, true);
  assert.equal(out.wonAt?.getTime(), 2);
  assert.equal(out.allowedBookingTypes, null);
  for (const k of ["bookingToken", "notionPageId", "followUpAt", "followUpNotifiedAt", "referredByClientId", "id"]) assert.ok(!(k in out), `no debe copiarse ${k}`);
});

test("a copied form never carries the API token or links that belong to the original organization", () => {
  const out = formCopyData({ name: "F", description: null, isActive: true, successAction: "MESSAGE", successMessage: null, redirectUrl: null, accentColor: null, backgroundColor: null, showNoxyBrand: true, apiAuthRequired: false, apiToken: "secreto", welcomeEmailId: "w", projectId: "p", appointmentTypeId: "a" } as never, { organizationId: "NEW", companyId: "NC" });
  assert.equal(out.apiToken, null);
  assert.equal(out.apiEnabled, false);
  assert.equal(out.apiAuthRequired, true);
  assert.equal(out.welcomeEmailId, null);
  assert.equal(out.projectId, null);
  assert.equal(out.appointmentTypeId, null);
  assert.equal(out.companyId, "NC");
});

test("the script is a dry run unless --apply, and only writes migratedToOrgId on the original company", () => {
  const src = readFileSync(new URL("../../scripts/company-to-org.ts", import.meta.url), "utf8");
  assert.match(src, /if \(!apply\) return/);
  assert.ok(src.indexOf("if (!apply) return") < src.indexOf("prisma.$transaction"));
  const writes = src.match(/tx\.(\w+)\.(create|update|createMany|delete|updateMany)/g) ?? [];
  assert.ok(!writes.some((w) => w.includes(".delete")), "no debe borrar nada");
  assert.equal(src.match(/tx\.\w+\.update\(\{ where: \{ id: companyId \}/g)?.length, 1);
  assert.equal((src.match(/tx\.\w+\.update\(/g) ?? []).length, 1);
  assert.match(src, /--team/);
  assert.match(src, /role: m\.role, permissions: m\.permissions/, "el equipo conserva su rol y permisos de origen");
  assert.match(src, /no es miembro de la organización de origen/, "solo entra gente que ya es del equipo");
});
