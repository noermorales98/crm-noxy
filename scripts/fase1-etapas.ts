// Etapas del pipeline comercial + pipeline «Noxy Editorial». Idempotente, sin borrados.
//   node scripts/fase1-etapas.ts                  → dry-run de todas las organizaciones
//   node scripts/fase1-etapas.ts --org <id> --apply → aplica solo a esa organización
import { createRequire } from "node:module";
// @ts-expect-error: node ejecuta el .ts directo
import { EDITORIAL_PIPELINE_NAME, EDITORIAL_STAGES, SALES_STAGES, planStages, type StageOp } from "../src/lib/pipeline-setup.ts";

for (const f of [".env", ".env.local"]) { try { process.loadEnvFile(f); } catch {} }
const { PrismaClient } = createRequire(import.meta.url)("@prisma/client");
const prisma = new PrismaClient();
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const orgArg = args.includes("--org") ? args[args.indexOf("--org") + 1] : null;

function show(label: string, ops: StageOp[]) {
  console.log(`  ${label}`);
  for (const o of ops) {
    const tag = o.type === "create" ? "+ crear " : o.type === "update" ? "~ cambiar" : "= igual  ";
    console.log(`   ${tag} ${o.order}. ${o.name}${o.isWon ? " [ganada]" : ""}${o.isLost ? " [perdida]" : ""}${o.legacy ? " (legado, se conserva)" : ""}${o.changes.length ? "  — " + o.changes.join(", ") : ""}`);
  }
}

async function syncPipeline(pipelineId: string, desired: typeof SALES_STAGES) {
  const existing = await prisma.stage.findMany({ where: { pipelineId }, orderBy: { order: "asc" } });
  const ops = planStages(existing, desired);
  if (apply) {
    await prisma.$transaction(async (tx: any) => {
      for (const o of ops) {
        if (o.type === "keep") continue;
        const data = { name: o.name, order: o.order, isWon: o.isWon, isLost: o.isLost, color: o.color };
        if (o.type === "create") await tx.stage.create({ data: { ...data, pipelineId } });
        else await tx.stage.update({ where: { id: o.stageId }, data });
      }
    });
  }
  return ops;
}

const orgs = await prisma.organization.findMany({ where: orgArg ? { id: orgArg } : {}, select: { id: true, name: true } });
console.log(apply ? "== APLICANDO ==" : "== DRY-RUN (no escribe nada) ==");
for (const org of orgs) {
  console.log(`\nOrganización ${org.name} (${org.id})`);
  const pipelines = await prisma.pipeline.findMany({ where: { organizationId: org.id }, orderBy: { createdAt: "asc" } });
  const sales = pipelines.find((p: any) => p.name !== EDITORIAL_PIPELINE_NAME);
  if (sales) show(`Pipeline «${sales.name}»`, await syncPipeline(sales.id, SALES_STAGES));
  let editorial = pipelines.find((p: any) => p.name === EDITORIAL_PIPELINE_NAME);
  if (!editorial && apply) editorial = await prisma.pipeline.create({ data: { name: EDITORIAL_PIPELINE_NAME, organizationId: org.id } });
  if (editorial) show(`Pipeline «${EDITORIAL_PIPELINE_NAME}»`, await syncPipeline(editorial.id, EDITORIAL_STAGES));
  else show(`Pipeline «${EDITORIAL_PIPELINE_NAME}» (se crearía)`, planStages([], EDITORIAL_STAGES));
}
await prisma.$disconnect();
