/* eslint-disable @typescript-eslint/no-explicit-any -- script de Node: Prisma entra por createRequire, sin tipos (igual que scripts/fase1-etapas.ts) */
// Convierte una Empresa en una sub-cuenta (Organization): COPIA sus contactos, deals y formularios. No mueve ni borra nada del original;
// lo único que escribe en la org de origen es Company.migratedToOrgId.
//
//   node scripts/company-to-org.ts --company <id> --user <correo>            → simulacro (por defecto): cuenta y avisa, no escribe
//   node scripts/company-to-org.ts --company <id> --user <correo> --apply    → crea la sub-cuenta (todo en una transacción)
//   opcionales: --name "Nombre de la sub-cuenta" (por defecto, el de la empresa)
//               --team correo1,correo2   miembros del equipo que también entran a la sub-cuenta, con el mismo rol y permisos que tienen en la org de origen
//
// Requiere el SQL prisma/sql/company-migrated-org.up.sql aplicado y `prisma generate`. --user debe ser miembro de la org de origen.
// Deshacer: borrar la Organization creada (en cascada se va todo lo copiado) y poner Company.migratedToOrgId = NULL; el informe trae los ids.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
// @ts-expect-error: node ejecuta el .ts directo
import { contactCopyData, contactIdsToCopy, dealCopyData, formCopyData, planPipelines } from "../src/lib/company-to-org.ts";
// @ts-expect-error: node ejecuta el .ts directo
import { DEFAULT_PIPELINES } from "../src/lib/organizations.ts";
// @ts-expect-error: node ejecuta el .ts directo
import { ALL_PERMISSIONS } from "../src/lib/permissions.ts";
// @ts-expect-error: node ejecuta el .ts directo
import { DEFAULT_TEMPLATES } from "../src/lib/project-templates.ts";

for (const f of [".env", ".env.local"]) { try { process.loadEnvFile(f); } catch {} }
const { PrismaClient } = createRequire(import.meta.url)("@prisma/client");
const prisma = new PrismaClient();

const args = process.argv.slice(2);
const opt = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const apply = args.includes("--apply");
const teamEmails = (opt("--team") ?? "").split(",").map((x) => x.trim()).filter(Boolean);
const companyId = opt("--company");
const email = opt("--user");
if (!companyId || !email) {
  console.error('Uso: node scripts/company-to-org.ts --company <id> --user <correo> [--name "…"] [--apply]');
  process.exit(2);
}

async function main() {
  const company = await prisma.company.findUnique({ where: { id: companyId }, include: { organization: { select: { id: true, name: true, timezone: true } } } });
  if (!company) throw new Error("No existe esa empresa.");
  if (company.migratedToOrgId) throw new Error(`Esta empresa ya se migró a la organización ${company.migratedToOrgId}. No se repite.`);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("No existe ese usuario.");
  const member = await prisma.organizationMember.findFirst({ where: { userId: user.id, organizationId: company.organizationId } });
  if (!member) throw new Error("Ese usuario no es miembro de la organización de origen.");

  const orgId = company.organizationId;
  const team: any[] = [];
  for (const teamEmail of teamEmails) {
    const m = await prisma.organizationMember.findFirst({ where: { organizationId: orgId, user: { email: teamEmail } } });
    if (!m) throw new Error(`${teamEmail} no es miembro de la organización de origen.`);
    if (m.userId !== user.id) team.push(m);
  }
  const [companyContacts, deals, forms] = await Promise.all([
    prisma.contact.findMany({ where: { companyId, organizationId: orgId } }),
    prisma.deal.findMany({ where: { companyId, organizationId: orgId }, include: { pipeline: { include: { stages: true } }, stage: true } }),
    prisma.form.findMany({ where: { companyId, organizationId: orgId }, include: { fields: true, variants: true, whatsAppRecipients: true, apiConfig: true } }),
  ]);
  const contactIds = contactIdsToCopy(companyContacts.map((c: any) => c.id), deals.map((d: any) => d.contactId));
  const contacts = await prisma.contact.findMany({ where: { id: { in: contactIds }, organizationId: orgId } });
  const usedPipelines: any[] = [...new Map<string, any>(deals.filter((d: any) => d.pipeline).map((d: any) => [d.pipeline.id, d.pipeline])).values()];
  const noPipeline = deals.filter((d: any) => !d.pipeline).length;

  const warn: string[] = [];
  const n = (xs: any[], f: (x: any) => boolean) => xs.filter(f).length;
  if (noPipeline) warn.push(`${noPipeline} deal(s) sin pipeline: irán a la primera etapa abierta del primer pipeline de la sub-cuenta.`);
  if (n(deals, (d) => d.followUpAt)) warn.push(`${n(deals, (d) => d.followUpAt)} deal(s) tienen seguimiento programado: NO se copia (el original seguiría avisando y habría avisos dobles).`);
  if (n(deals, (d) => d.notionPageId)) warn.push(`${n(deals, (d) => d.notionPageId)} deal(s) enlazados a Notion: el enlace no se copia.`);
  if (n(forms, (f) => f.welcomeEmailId || f.projectId || f.appointmentTypeId)) warn.push("Formularios con correo de bienvenida, proyecto o tipo de cita: esos enlaces no se copian; configúralos en la sub-cuenta.");
  if (n(forms, (f) => f.whatsAppRecipients.length)) warn.push("Formularios con destinatarios de WhatsApp: no se copian (los avisos se deciden por sub-cuenta).");
  if (n(forms, (f) => f.apiEnabled || f.apiConfig?.isEnabled)) warn.push("Formularios con API activa: la copia nace con la API apagada y sin token.");
  if (forms.length) warn.push("Los formularios copiados tienen URL pública NUEVA; el original sigue activo hasta que cambies el enlace en la web del cliente.");
  warn.push("No se copian: correo SMTP/IMAP de la empresa, tareas, proyectos, cotizaciones, pagos, citas ni bóveda.");

  const summary = {
    empresa: company.name, origen: company.organization.name, usuarioOwner: email, equipo: teamEmails,
    contactos: contacts.length, deals: deals.length, formularios: forms.length,
    pipelinesUsados: usedPipelines.map((p: any) => p.name),
  };
  console.log(apply ? "== APLICANDO ==" : "== SIMULACRO (no escribe nada) ==");
  console.log(JSON.stringify(summary, null, 2));
  for (const w of warn) console.log("  ⚠ " + w);
  if (!apply) return console.log("\nNada escrito. Para crear la sub-cuenta: añade --apply.");

  const name = (opt("--name") || company.name).trim();
  const created = await prisma.$transaction(async (tx: any) => {
    const org = await tx.organization.create({ data: { name, timezone: company.organization.timezone } });
    await tx.organizationMember.create({ data: { userId: user.id, organizationId: org.id, role: "OWNER", permissions: ALL_PERMISSIONS } });
    for (const m of team) await tx.organizationMember.create({ data: { userId: m.userId, organizationId: org.id, role: m.role, permissions: m.permissions ?? undefined } });
    const newCompany = await tx.company.create({ data: { name: company.name, website: company.website, industry: company.industry, hideContacts: company.hideContacts, organizationId: org.id } });
    for (const p of DEFAULT_PIPELINES) {
      await tx.pipeline.create({ data: { name: p.name, organizationId: org.id, stages: { create: p.stages.map((s: any, i: number) => ({ name: s.name, order: i + 1, isWon: !!s.isWon, isLost: !!s.isLost, color: s.color })) } } });
    }
    await tx.projectTemplate.createMany({ data: DEFAULT_TEMPLATES.map((t: any) => ({ organizationId: org.id, service: t.service, description: t.description, tasks: JSON.stringify(t.tasks) })) });

    // Pipelines y etapas: se casan por nombre con los sembrados; lo que falte se crea igual que en el original.
    const dst = await tx.pipeline.findMany({ where: { organizationId: org.id }, include: { stages: true }, orderBy: { createdAt: "asc" } });
    const plans = planPipelines(usedPipelines, dst);
    const stageMap = new Map<string, string>();
    const pipelineMap = new Map<string, string>();
    for (const plan of plans) {
      const pipelineId = plan.targetId ?? (await tx.pipeline.create({ data: { name: plan.name, organizationId: org.id } })).id;
      pipelineMap.set(plan.sourceId, pipelineId);
      let next = (await tx.stage.count({ where: { pipelineId } })) + 1;
      for (const s of plan.stages) {
        const stageId = s.targetId ?? (await tx.stage.create({ data: { name: s.name, order: next++, color: s.color, isWon: s.isWon, isLost: s.isLost, pipelineId } })).id;
        stageMap.set(s.sourceId, stageId);
      }
    }
    // Deals sin pipeline: primera etapa abierta del primer pipeline de la sub-cuenta.
    const fallback = dst[0]?.stages.slice().sort((a: any, b: any) => a.order - b.order).find((s: any) => !s.isWon && !s.isLost) ?? dst[0]?.stages[0];

    const formMap = new Map<string, string>();
    const variantMap = new Map<string, string>();
    for (const f of forms) {
      const nf = await tx.form.create({ data: formCopyData(f, { organizationId: org.id, companyId: newCompany.id }) });
      formMap.set(f.id, nf.id);
      if (f.fields.length) await tx.formField.createMany({ data: f.fields.map((x: any) => ({ formId: nf.id, type: x.type, label: x.label, name: x.name, placeholder: x.placeholder, isRequired: x.isRequired, options: x.options, order: x.order })) });
      for (const v of f.variants) variantMap.set(v.id, (await tx.formVariant.create({ data: { formId: nf.id, name: v.name, description: v.description, isActive: v.isActive } })).id);
    }
    const contactMap = new Map<string, string>();
    for (const c of contacts) contactMap.set(c.id, (await tx.contact.create({ data: contactCopyData(c, { organizationId: org.id, companyId: newCompany.id, formMap, variantMap }) })).id);
    for (const d of deals) {
      const stageId = stageMap.get(d.stageId) ?? fallback?.id;
      if (!stageId) throw new Error(`Sin etapa de destino para el deal ${d.id}.`);
      await tx.deal.create({ data: dealCopyData(d, { organizationId: org.id, companyId: newCompany.id, stageId, pipelineId: (d.pipelineId && pipelineMap.get(d.pipelineId)) || dst[0]?.id, contactMap }) });
    }
    await tx.company.update({ where: { id: companyId }, data: { migratedToOrgId: org.id } });
    return { organizationId: org.id, companyId: newCompany.id, contacts: contactMap.size, deals: deals.length, forms: formMap.size };
  }, { timeout: 120_000, maxWait: 20_000 });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const report = resolve("backups", `company-to-org-${stamp}.json`);
  mkdirSync(resolve("backups"), { recursive: true });
  writeFileSync(report, JSON.stringify({ ...summary, creado: created, deshacer: `Borrar Organization ${created.organizationId} y poner Company.migratedToOrgId = NULL en ${companyId}` }, null, 2));
  console.log("\nSub-cuenta creada:", JSON.stringify(created, null, 2));
  console.log("Informe (con cómo deshacerlo):", report);
}

main().catch((e) => { console.error(e.message || e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
