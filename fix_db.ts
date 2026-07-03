import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const result1 = await prisma.transaction.updateMany({
    where: { category: 'Pemberian' },
    data: { category: 'Gift' }
  });
  console.log(`Updated ${result1.count} 'Pemberian' to 'Gift'`);

  const result2 = await prisma.transaction.updateMany({
    where: { category: 'Lainnya' },
    data: { category: 'Other' }
  });
  console.log(`Updated ${result2.count} 'Lainnya' to 'Other'`);

  const result3 = await prisma.transaction.updateMany({
    where: { category: 'Belanja' },
    data: { category: 'Shopping' }
  });
  console.log(`Updated ${result3.count} 'Belanja' to 'Shopping'`);

  const result4 = await prisma.transaction.updateMany({
    where: { category: 'Makan & Minum' },
    data: { category: 'Food & Drink' }
  });
  console.log(`Updated ${result4.count} 'Makan & Minum' to 'Food & Drink'`);

  const result5 = await prisma.transaction.updateMany({
    where: { store: 'tidak disebut' },
    data: { store: 'Not mentioned' }
  });
  console.log(`Updated ${result5.count} 'tidak disebut' to 'Not mentioned'`);

  const result6 = await prisma.transaction.updateMany({
    where: { raw: 'received 5 million from friend', type: 'pengeluaran' },
    data: { type: 'pemasukan' }
  });
  console.log(`Fixed ${result6.count} bad expense entry`);
}
main().finally(() => prisma.$disconnect());
