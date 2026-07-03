import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const transactions = await prisma.transaction.findMany();
  
  for (const t of transactions) {
    let newCategory = t.category;
    let newNote = t.note;
    let newStore = t.store;
    let newType = t.type;
    
    // Fix categories
    if (newCategory?.toLowerCase() === 'makanan' || newCategory?.toLowerCase() === 'makanan & minuman') newCategory = 'Food & Drink';
    if (newCategory?.toLowerCase() === 'gaji') newCategory = 'Salary';
    if (newCategory?.toLowerCase() === 'lainnya') newCategory = 'Other';
    if (newCategory?.toLowerCase() === 'pemberian') newCategory = 'Gift';
    
    // Fix stores
    if (newStore?.toLowerCase() === 'tidak disebut') newStore = 'Not mentioned';
    
    // Fix notes
    if (newNote?.toLowerCase() === 'gaji diterima') newNote = 'Salary received';
    if (newNote?.toLowerCase() === 'dari mom') newNote = 'From mom';
    
    // Fix the 5M entry type just in case
    if (newNote?.toLowerCase().includes('5 million') || newNote?.toLowerCase() === 'received' && t.amount === 5000000) {
      newType = 'pemasukan';
    }
    
    await prisma.transaction.update({
      where: { id: t.id },
      data: {
        category: newCategory,
        note: newNote,
        store: newStore,
        type: newType,
      }
    });
  }
  console.log("Database updated successfully");
}

main().catch(console.error).finally(() => prisma.$disconnect());
