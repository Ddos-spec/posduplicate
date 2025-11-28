
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- Debugging Dashboard Data ---');

  // 1. Simulate "Today" Range (2025-11-28)
  // Note: Node.js Date is UTC based usually.
  const startStr = "2025-11-28";
  const endStr = "2025-11-28";

  const startDate = new Date(startStr);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(endStr);
  endDate.setHours(23, 59, 59, 999);

  console.log(`Filter Range (UTC): ${startDate.toISOString()} to ${endDate.toISOString()}`);

  // 2. Fetch Transactions like Summary
  const summary = await prisma.transaction.aggregate({
    where: {
      status: 'completed',
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    _sum: { total: true },
    _count: { id: true }
  });

  console.log('\nSummary Result:');
  console.log('Total Sales:', summary._sum.total);
  console.log('Count:', summary._count.id);

  // 3. Fetch Transactions like Trend
  const transactions = await prisma.transaction.findMany({
    where: {
      status: 'completed',
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    select: {
      id: true,
      transaction_number: true,
      total: true,
      createdAt: true
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log('\nTrend Transactions (Raw):');
  const grouped: { [key: string]: number } = {};
  
  transactions.forEach(t => {
    if (!t.createdAt) return;
    console.log(`- ID: ${t.id}, Total: ${t.total}, CreatedAt: ${t.createdAt.toISOString()}`);
    const date = t.createdAt.toISOString().split('T')[0];
    grouped[date] = (grouped[date] || 0) + Number(t.total);
  });

  console.log('\nTrend Grouped (Date Only):');
  console.log(grouped);

}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
