import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Updating stages...");
  const wonStages = await prisma.stage.updateMany({
    where: { name: { contains: "Ganado" } },
    data: { isWon: true, color: "#10b981" }
  });
  console.log(`Updated ${wonStages.count} Ganado stages to isWon=true`);

  const pipelines = await prisma.pipeline.findMany({ include: { stages: true } });
  let newLostCount = 0;
  for (const p of pipelines) {
    const hasLost = p.stages.some(s => s.name.toLowerCase().includes("perdid") || s.isLost);
    if (!hasLost) {
      await prisma.stage.create({
        data: {
          name: "Perdido",
          order: p.stages.length + 1,
          isLost: true,
          color: "#ef4444",
          pipelineId: p.id
        }
      });
      newLostCount++;
    }
  }
  console.log(`Created ${newLostCount} Perdido stages.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
