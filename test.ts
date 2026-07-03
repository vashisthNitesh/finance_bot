import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const tx = await prisma.transaction.findMany({ orderBy: { date: 'desc' }, take: 5 });
  console.log(tx);
}
main().finally(() => prisma.$disconnect());
