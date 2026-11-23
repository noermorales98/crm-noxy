/* eslint-disable @typescript-eslint/no-explicit-any -- script de Node: Prisma entra por createRequire, sin tipos (igual que scripts/company-to-org.ts) */
// MUEVE de verdad los contactos y formularios de una empresa a su sub-cuenta (la que creó company-to-org.ts):
// los ORIGINALES cambian de organización (conservan id, enlace público de los formularios, historial de correos y tareas)
// y las COPIAS que dejó la migración se borran. Una transacción por empresa.
//
//   node scripts/move-company-data.ts --company <id> --user <correo>            → simulacro (por defecto): cuenta, no escribe
//   node scripts/move-company-data.ts --company <id> --user <correo> --apply    → mueve (respaldo JSON en backups/ antes)
//
// --user es quien queda como responsable de una tarea movida si su responsable no es miembro de la sub-cuenta.
// Se detiene sin escribir nada si el original tiene deals, cotizaciones, citas, clientes o proyectos ligados (eso es de la org de origen).
// Pierde a propósito: Form.projectId, welcomeEmailId y appointmentTypeId (viven en la org de origen), y Task.projectId/categoryId/dealId.
import { createRequire } from "node:module";
import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

for (const f of [".env", ".env.local"]) { try { process.loadEnvFile(f); } catch {} }
const { PrismaClient } = createRequire(import.meta.url)("@prisma/client");
const prisma = new PrismaClient();

const args = process.argv.slice(2);
const opt = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const apply = args.includes("--apply");
const companyId = opt("--company");
const email = opt("--user");
if (!companyId || !email) {
  console.error("Uso: node scripts/move-company-data.ts --company <id> --user <correo> [--apply]");
  process.exit(2);
}

const norm = (s: string | null | undefined) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
const key = (c: any) => norm(c.email) || (c.phone ?? "").replace(/\D/g, "") || norm(`${c.firstName} ${c.lastName ?? ""}`);

async function main() {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new Error("No existe esa empresa.");
  if (!company.migratedToOrgId) throw new Error("Esta empresa aún no es sub-cuenta (migratedToOrgId vacío).");
  const O = company.organizationId;
  const T = company.migratedToOrgId;
  const targetCompany = await prisma.company.findFirst({ where: { organizationId: T, name: company.name } });
  if (!targetCompany) throw new Error("No encuentro la empresa homónima en la sub-cuenta.");
  const operator = await prisma.user.findUnique({ where: { email } });
  if (!operator || !(await prisma.organizationMember.findFirst({ where: { userId: operator.id, organizationId: T } }))) throw new Error("--user debe ser miembro de la sub-cuenta.");

  const [originals, originalForms, copies, copyForms] = await Promise.all([
    prisma.contact.findMany({ where: { companyId: company.id, organizationId: O } }),
    prisma.form.findMany({ where: { companyId: company.id, organizationId: O }, select: { id: true, name: true } }),
    prisma.contact.findMany({ where: { organizationId: T, companyId: targetCompany.id } }),
    prisma.form.findMany({ where: { organizationId: T, companyId: targetCompany.id }, select: { id: true, name: true } }),
  ]);
  if (originals.length === 0 && originalForms.length === 0) return console.log(`${company.name}: nada que mover (ya está hecho).`);

  const oc = originals.map((c: any) => c.id);
  const ofm = originalForms.map((f: any) => f.id);
  const blockers = {
    deals: await prisma.deal.count({ where: { OR: [{ contactId: { in: oc } }, { referredByContactId: { in: oc } }] } }),
    cotizaciones: await prisma.quote.count({ where: { contactId: { in: oc } } }),
    citas: await prisma.appointment.count({ where: { contactId: { in: oc } } }),
    clientes: await prisma.client.count({ where: { contactId: { in: oc } } }),
    proyectos: await prisma.project.count({ where: { contactId: { in: oc } } }),
  };
  const blocked = Object.entries(blockers).filter(([, n]) => n > 0);
  if (blocked.length) throw new Error(`${company.name}: los contactos originales tienen ${blocked.map(([k, n]) => `${n} ${k}`).join(", ")} en la org de origen; no se mueven. Revisa a mano.`);

  const taskWhere = { organizationId: O, OR: [{ formId: { in: ofm } }, { contactId: { in: oc } }] };
  const tasks = await prisma.task.findMany({ where: taskWhere });
  const members = new Set((await prisma.organizationMember.findMany({ where: { organizationId: T }, select: { userId: true } })).map((m: any) => m.userId));
  const reassign = tasks.filter((t: any) => !members.has(t.assignedToId)).length;
  const campaigns = await prisma.emailCampaign.count({ where: { organizationId: O, targetFormId: { in: ofm } } });
  const emailLogs = await prisma.emailLog.count({ where: { contactId: { in: oc } } });

  // Copias: solo se borran las que corresponden a un original (mismo correo/teléfono/nombre); el resto se conserva.
  const originalKeys = new Set(originals.map(key));
  const copyDeals = await prisma.deal.findMany({ where: { organizationId: T, OR: [{ contactId: { in: copies.map((c: any) => c.id) } }, { referredByContactId: { in: copies.map((c: any) => c.id) } }] } });
  const matchedCopies = copies.filter((c: any) => originalKeys.has(key(c)));
  const unmatchedCopies = copies.length - matchedCopies.length;
  const byKey = new Map<string, string>();
  for (const o of originals) if (!byKey.has(key(o))) byKey.set(key(o), o.id);

  console.log(JSON.stringify({
    empresa: company.name, deOrg: O, aOrg: T,
    mover: { contactos: originals.length, formularios: originalForms.map((f: any) => f.name), tareas: tasks.length, tareasSinResponsableEnLaSubcuenta: reassign, registrosDeCorreoQueSeConservan: emailLogs, campanasQueDejanDeApuntarAlFormulario: campaigns },
    borrarCopias: { contactos: matchedCopies.length, contactosCopiaSinOriginal_seConservan: unmatchedCopies, formularios: copyForms.map((f: any) => f.name), dealsDeLaSubcuentaQueSeReenlazanAlOriginal: copyDeals.length },
  }, null, 2));

  if (!apply) return console.log("Simulacro: no se escribió nada. Para mover: --apply (respaldo antes).");

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = resolve("backups", `mover-${company.name.replace(/\W+/g, "-")}-${stamp}.json`);
  mkdirSync(resolve("backups"), { recursive: true });
  writeFileSync(file, JSON.stringify({ company: company.name, from: O, to: T, originalContacts: originals, originalForms, tasksBefore: tasks, deletedCopies: matchedCopies, deletedCopyForms: copyForms, copyDeals }, null, 2), { mode: 0o600 });
  chmodSync(file, 0o600);
  console.log(`Respaldo (puede traer datos personales): ${file}`);

  await prisma.$transaction(async (tx: any) => {
    // 1) Los deals de la sub-cuenta que apuntaban a una copia pasan a apuntar al original.
    const idOf = new Map(copies.map((c: any) => [c.id, byKey.get(key(c))]));
    for (const d of copyDeals) {
      const data: any = {};
      if (d.contactId && idOf.get(d.contactId)) data.contactId = idOf.get(d.contactId);
      if (d.referredByContactId && idOf.get(d.referredByContactId)) data.referredByContactId = idOf.get(d.referredByContactId);
      if (Object.keys(data).length) await tx.deal.update({ where: { id: d.id }, data });
    }
    // 2) Se borran las copias (contactos con original y formularios de la migración).
    await tx.contact.deleteMany({ where: { id: { in: matchedCopies.map((c: any) => c.id) } } });
    await tx.form.deleteMany({ where: { id: { in: copyForms.map((f: any) => f.id) } } });
    // 3) Los formularios originales cambian de organización conservando id y enlace público.
    await tx.form.updateMany({ where: { id: { in: ofm } }, data: { organizationId: T, companyId: targetCompany.id, projectId: null, welcomeEmailId: null, appointmentTypeId: null } });
    // 4) Los contactos originales también.
    await tx.contact.updateMany({ where: { id: { in: oc } }, data: { organizationId: T, companyId: targetCompany.id } });
    // 5) Sus tareas: nueva org, sin vínculos a cosas de la org de origen y con un responsable que sea miembro.
    await tx.task.updateMany({ where: { id: { in: tasks.map((t: any) => t.id) } }, data: { organizationId: T, companyId: targetCompany.id, projectId: null, categoryId: null, dealId: null } });
    const lost = tasks.filter((t: any) => !members.has(t.assignedToId)).map((t: any) => t.id);
    if (lost.length) await tx.task.updateMany({ where: { id: { in: lost } }, data: { assignedToId: operator.id } });
    // 6) Campañas de la org de origen que apuntaban a esos formularios dejan de apuntar.
    await tx.emailCampaign.updateMany({ where: { organizationId: O, targetFormId: { in: ofm } }, data: { targetFormId: null } });
  }, { timeout: 120_000, maxWait: 20_000 });

  console.log(`${company.name}: movido. Contactos ${originals.length}, formularios ${ofm.length}, tareas ${tasks.length}.`);
}

main().catch((e) => { console.error(e.message || e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
