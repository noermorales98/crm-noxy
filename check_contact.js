const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const contact = await prisma.contact.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { tasks: true }
  })
  console.log(JSON.stringify(contact, null, 2))
}
main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
