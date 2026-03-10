const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const fields = await prisma.formField.findMany()
  console.log(JSON.stringify(fields, null, 2))
}
main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
