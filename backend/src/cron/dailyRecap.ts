import cron from 'node-cron';
import prisma from '../utils/prisma';
import { GoogleSheetService } from '../services/googleSheet.service';

// Service Account Credentials - GUNAKAN ENVIRONMENT VARIABLES
const SERVICE_ACCOUNT_CREDENTIALS = {
  type: "service_account",
  project_id: process.env.GOOGLE_PROJECT_ID || "peroject-whatsapp",
  private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID || "ee4e8f569dbd1345b6581b5edab5e2a2692ce941",
  private_key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, '\n'),
  client_email: process.env.GOOGLE_CLIENT_EMAIL || "n8n-refresh-token@peroject-whatsapp.iam.gserviceaccount.com",
  client_id: process.env.GOOGLE_CLIENT_ID || "118421492513506607479",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.GOOGLE_CERT_URL || "https://www.googleapis.com/robot/v1/metadata/x509/n8n-refresh-token%40peroject-whatsapp.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

const googleSheetService = new GoogleSheetService(SERVICE_ACCOUNT_CREDENTIALS);

export const startDailyRecapCronJob = () => {
  cron.schedule('0 0 * * *', async () => {
    console.log('Running daily Google Sheet recap cron job...');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const tenants = await prisma.tenant.findMany({
        where: {
          googleSheetId: {
            not: null,
          },
        },
      });

      for (const tenant of tenants) {
        if (tenant.googleSheetId) {
          console.log(`Processing daily recap for tenant: ${tenant.businessName} (ID: ${tenant.id})`);

          // --- 1. Rekap Detail Penjualan ---
          const salesData = await prisma.transaction.findMany({
            where: {
              outlets: {
                tenantId: tenant.id,
              },
              createdAt: {
                gte: yesterday,
                lt: today,
              },
            },
            include: {
              transaction_items: {
                include: {
                  items: true,
                  variants: true,
                },
              },
              users: true,
              payments: true,
            },
          });

          const salesRows: any[][] = [];
          for (const transaction of salesData) {
            if (transaction.transaction_items && transaction.transaction_items.length > 0) {
              for (const item of transaction.transaction_items) {
                salesRows.push([
                  transaction.createdAt?.toLocaleDateString('id-ID') || '',
                  transaction.createdAt?.toLocaleTimeString('id-ID') || '',
                  transaction.transaction_number,
                  transaction.users?.name || 'N/A',
                  transaction.order_type,
                  item.item_name,
                  item.variants?.name || 'N/A',
                  item.quantity.toNumber(),
                  item.unit_price.toNumber(),
                  item.subtotal.toNumber(),
                  transaction.discountAmount?.toNumber() || 0,
                  transaction.taxAmount?.toNumber() || 0,
                  transaction.total?.toNumber() || 0,
                  transaction.payments && transaction.payments[0]?.method || 'N/A',
                ]);
              }
            }
          }
          
          if (salesRows.length > 0) {
            await googleSheetService.appendData(tenant.googleSheetId, 'Detail Penjualan', salesRows);
            console.log(`Appended ${salesRows.length} sales rows for tenant ${tenant.id}`);
          } else {
            console.log(`No sales data for tenant ${tenant.id} for yesterday.`);
          }

          // --- 2. Rekap Stok ---
          const stockData = await prisma.items.findMany({
            where: {
              outlets: {
                tenantId: tenant.id,
              },
              isActive: true,
            },
          });

          // Fetch categories separately if needed
          const categoryIds = stockData.map(item => item.categoryId).filter(id => id !== null) as number[];
          const categories = await prisma.categories.findMany({
            where: {
              id: { in: categoryIds }
            }
          });
          const categoryMap = new Map(categories.map(cat => [cat.id, cat.name]));

          const stockRows: any[][] = [];
          for (const item of stockData) {
            stockRows.push([
              item.sku || 'N/A',
              item.name,
              item.categoryId ? (categoryMap.get(item.categoryId) || 'N/A') : 'N/A',
              item.stock?.toNumber() || 0,
              'Pcs',
              item.minStock?.toNumber() || 0,
            ]);
          }
          
          if (stockRows.length > 0) {
            await googleSheetService.appendData(tenant.googleSheetId, 'Stok', stockRows);
            console.log(`Appended ${stockRows.length} stock rows for tenant ${tenant.id}`);
          } else {
            console.log(`No stock data for tenant ${tenant.id}.`);
          }

          // --- 3. Rekap Daftar Harga ---
          const priceListData = await prisma.items.findMany({
            where: {
              outlets: {
                tenantId: tenant.id,
              },
              isActive: true,
            },
          });

          const priceListRows: any[][] = [];
          for (const item of priceListData) {
            priceListRows.push([
              item.sku || 'N/A',
              item.name,
              item.categoryId ? (categoryMap.get(item.categoryId) || 'N/A') : 'N/A',
              item.price.toNumber(),
            ]);
          }
          
          if (priceListRows.length > 0) {
            await googleSheetService.appendData(tenant.googleSheetId, 'Daftar Harga', priceListRows);
            console.log(`Appended ${priceListRows.length} price list rows for tenant ${tenant.id}`);
          } else {
            console.log(`No price list data for tenant ${tenant.id}.`);
          }

          console.log(`'Pengeluaran' sheet for tenant ${tenant.id} skipped as data source is not implemented.`);
        }
      }
    } catch (error) {
      console.error('Error in daily Google Sheet recap cron job:', error);
    }
  });
  
  console.log('Daily Google Sheet recap cron job scheduled to run every day at midnight.');
};
