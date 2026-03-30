import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting migration...');
  
  // Get all forms
  const forms = await prisma.form.findMany({ select: { id: true, name: true, organizationId: true } });
  
  if (forms.length === 0) {
    console.log('No forms found. Exiting.');
    process.exit(0);
  }

  let updatedCount = 0;

  for (const form of forms) {
    console.log(`Processing form: ${form.name} (${form.id})`);
    
    // Find contacts lacking sourceFormId but with matching source property
    // We check BOTH "Form: <name>" and organizationId to be completely safe
    const contacts = await prisma.contact.findMany({
      where: {
        source: `Form: ${form.name}`,
        sourceFormId: null,
        organizationId: form.organizationId
      }
    });

    if (contacts.length > 0) {
      console.log(`  Found ${contacts.length} legacy contacts. Updating...`);
      const { count } = await prisma.contact.updateMany({
        where: {
          id: { in: contacts.map(c => c.id) }
        },
        data: {
          sourceFormId: form.id
        }
      });
      updatedCount += count;
    }
    
    // Similarly, let's link the old Tasks if they contain "Nuevo lead en <name>"
    const tasks = await prisma.task.findMany({
      where: {
        title: `Nuevo lead en ${form.name}`,
        formId: null,
        organizationId: form.organizationId
      }
    });
    
    if (tasks.length > 0) {
      console.log(`  Found ${tasks.length} legacy tasks. Updating...`);
      await prisma.task.updateMany({
        where: { id: { in: tasks.map(t => t.id) } },
        data: { formId: form.id }
      });
    }
  }

  console.log(`Migration completed successfully! Updated ${updatedCount} legacy contacts.`);
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
