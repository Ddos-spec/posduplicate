import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnose() {
  console.log('--- DIAGNOSTIC START ---');
  console.log('Timestamp:', new Date().toISOString());
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not Set');

  try {
    // 1. Check Connection and Transaction Count
    console.log('\nChecking Transaction Counts...');
    const count = await prisma.transaction.count();
    console.log(`Total Transactions in DB: ${count}`);

    // 2. Check Last 5 Transactions
    console.log('\nLast 5 Transactions:');
    const lastTransactions = await prisma.transaction.findMany({
      take: 5,
      orderBy: { id: 'desc' },
      include: {
        outlets: { select: { id: true, name: true, tenantId: true } }
      }
    });

    if (lastTransactions.length === 0) {
      console.log('No transactions found.');
    } else {
      lastTransactions.forEach(t => {
        console.log(`- ID: ${t.id}, Number: ${t.transaction_number}, Outlet: ${t.outletId} (${t.outlets?.name}), Tenant: ${t.outlets?.tenantId}, CreatedAt: ${t.createdAt}`);
      });
    }

    // 3. Check Sequence Status (approximate by max ID)
    const maxId = lastTransactions.length > 0 ? lastTransactions[0].id : 0;
    console.log(`\nMax Transaction ID: ${maxId}`);

    // 4. Check Outlets
    console.log('\nOutlets:');
    const outlets = await prisma.outlet.findMany({
      select: { id: true, name: true, tenantId: true }
    });
    outlets.forEach(o => {
      console.log(`- ID: ${o.id}, Name: ${o.name}, Tenant: ${o.tenantId}`);
    });

  } catch (error) {
    console.error('DIAGNOSTIC ERROR:', error);
  } finally {
    console.log('\n--- DIAGNOSTIC END ---');
    await prisma.$disconnect();
  }
}

diagnose();
