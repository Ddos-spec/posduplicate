import cron from 'node-cron';
import prisma from '../utils/prisma';

// Helper: Generate inventory alerts for all outlets
async function generateInventoryAlerts() {
  console.log('[Scheduler] Generating inventory alerts...');

  const items = await prisma.inventory.findMany({
    where: { is_active: true }
  });

  let createdCount = 0;

  for (const item of items) {
    const currentStock = parseFloat(item.current_stock.toString());
    const minStock = parseFloat(item.min_stock.toString());
    const daysCover = item.days_cover ? parseFloat(item.days_cover.toString()) : null;
    const outletId = item.outlet_id || 0;

    const alertsToCreate: { alert_type: string; severity: string; message: string }[] = [];

    // Out of stock
    if (currentStock <= 0) {
      alertsToCreate.push({
        alert_type: 'out_of_stock',
        severity: 'critical',
        message: `${item.name} HABIS! Segera lakukan restock.`
      });
    }
    // Low stock
    else if (currentStock <= minStock) {
      alertsToCreate.push({
        alert_type: 'low_stock',
        severity: 'warning',
        message: `${item.name} menipis (sisa ${currentStock} ${item.unit}). Min: ${minStock}`
      });
    }

    // Low days cover
    if (daysCover !== null && daysCover < 3 && currentStock > 0) {
      alertsToCreate.push({
        alert_type: 'low_days_cover',
        severity: 'warning',
        message: `${item.name} hanya cukup ${daysCover} hari. Segera order.`
      });
    }

    // Expiring items
    if (item.expiry_date) {
      const daysUntilExpiry = Math.ceil((item.expiry_date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry <= 0) {
        alertsToCreate.push({
          alert_type: 'expired',
          severity: 'critical',
          message: `${item.name} sudah EXPIRED! Batch: ${item.batch_no || '-'}`
        });
      } else if (daysUntilExpiry <= 30) {
        alertsToCreate.push({
          alert_type: 'expiring_soon',
          severity: 'warning',
          message: `${item.name} akan expired dalam ${daysUntilExpiry} hari. Batch: ${item.batch_no || '-'}`
        });
      }
    }

    // Create alerts (skip duplicates)
    for (const alertData of alertsToCreate) {
      const existing = await prisma.inventory_alerts.findFirst({
        where: {
          inventory_id: item.id,
          alert_type: alertData.alert_type,
          is_resolved: false
        }
      });

      if (!existing) {
        await prisma.inventory_alerts.create({
          data: {
            outlet_id: outletId,
            inventory_id: item.id,
            ...alertData
          }
        });
        createdCount++;
      }
    }
  }

  console.log(`[Scheduler] Created ${createdCount} inventory alerts`);
  return createdCount;
}

// Helper: Auto-generate reorder POs
async function autoGenerateReorderPOs() {
  console.log('[Scheduler] Checking auto-reorder items...');

  // Get settings with auto_reorder_enabled
  const settings = await prisma.inventory_settings.findMany({
    where: { auto_reorder_enabled: true }
  });

  const outletIds = settings.map(s => s.outlet_id);
  if (outletIds.length === 0) return 0;

  // Find low stock items in outlets with auto-reorder enabled
  const lowStockItems = await prisma.inventory.findMany({
    where: {
      is_active: true,
      outlet_id: { in: outletIds },
      supplier_id: { not: null }
    },
    include: {
      suppliers: { select: { id: true, name: true } }
    }
  });

  let createdPOs = 0;

  // Group items by outlet and supplier
  const groupedItems: Record<string, typeof lowStockItems> = {};

  for (const item of lowStockItems) {
    const currentStock = parseFloat(item.current_stock.toString());
    const minStock = parseFloat(item.min_stock.toString());

    // Only process if stock is at or below minimum
    if (currentStock > minStock) continue;

    const key = `${item.outlet_id}-${item.supplier_id}`;
    if (!groupedItems[key]) groupedItems[key] = [];
    groupedItems[key].push(item);
  }

  for (const key of Object.keys(groupedItems)) {
    const items = groupedItems[key];
    if (items.length === 0) continue;

    const firstItem = items[0];
    const outletId = firstItem.outlet_id!;
    const supplierId = firstItem.supplier_id!;

    // Check if there's already a pending/draft PO for this outlet+supplier
    const existingPO = await prisma.purchase_orders.findFirst({
      where: {
        outlet_id: outletId,
        supplier_id: supplierId,
        status: { in: ['draft', 'pending'] }
      }
    });

    if (existingPO) continue; // Skip if PO already exists

    // Calculate reorder quantities
    const poItems = items.map(item => {
      const currentStock = parseFloat(item.current_stock.toString());
      const minStock = parseFloat(item.min_stock.toString());
      const avgDailyUsage = item.avg_daily_usage ? parseFloat(item.avg_daily_usage.toString()) : 5;
      const leadDays = 7; // Default lead time
      const safetyStock = minStock;

      // Reorder quantity = (lead_days * daily_usage) + safety_stock - current_stock
      const reorderQty = Math.max(Math.ceil((leadDays * avgDailyUsage) + safetyStock - currentStock), 1);
      const unitCost = parseFloat(item.cost_amount.toString()) || 0;

      return {
        inventory_id: item.id,
        quantity: reorderQty,
        unit: item.unit,
        unit_price: unitCost,
        subtotal: reorderQty * unitCost
      };
    });

    const totalAmount = poItems.reduce((sum, i) => sum + i.subtotal, 0);

    // Create PO - need a system user for created_by
    const po = await prisma.purchase_orders.create({
      data: {
        outlet_id: outletId,
        supplier_id: supplierId,
        po_number: `AUTO-${Date.now()}`,
        status: 'draft',
        total: totalAmount,
        notes: 'Auto-generated by system due to low stock',
        expected_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        created_by: 1 // System user
      }
    });

    // Create PO items
    for (const poItem of poItems) {
      await prisma.purchase_order_items.create({
        data: {
          po_id: po.id,
          inventory_id: poItem.inventory_id,
          quantity: poItem.quantity,
          unit: poItem.unit,
          unit_price: poItem.unit_price,
          subtotal: poItem.subtotal
        }
      });
    }

    createdPOs++;
    console.log(`[Scheduler] Created auto-reorder PO #${po.po_number} for outlet ${outletId}`);
  }

  console.log(`[Scheduler] Created ${createdPOs} auto-reorder POs`);
  return createdPOs;
}

// Run every minute - Social media scheduler
const socialScheduler = cron.schedule('* * * * *', async () => {
  console.log('[Scheduler] Checking for scheduled posts...');

  try {
    const now = new Date();

    // Find posts ready to publish
    const scheduledPosts = await prisma.social_posts.findMany({
      where: {
        status: 'scheduled',
        scheduled_at: {
          lte: now
        }
      }
    });

    for (const post of scheduledPosts) {
      console.log(`[Scheduler] Publishing post ID ${post.id} to ${post.platform}...`);

      await prisma.social_posts.update({
        where: { id: post.id },
        data: {
          status: 'published',
          published_at: now
        }
      });

      await prisma.social_analytics.upsert({
        where: { post_id: post.id },
        create: { post_id: post.id, likes: 0, reach: 0 },
        update: { updated_at: now }
      });
    }

  } catch (error) {
    console.error('[Scheduler] Social posts error:', error);
  }
});

// Run every hour - Inventory alerts
const inventoryAlertScheduler = cron.schedule('0 * * * *', async () => {
  try {
    await generateInventoryAlerts();
  } catch (error) {
    console.error('[Scheduler] Inventory alerts error:', error);
  }
});

// Run every 6 hours - Auto-reorder POs
const autoReorderScheduler = cron.schedule('0 */6 * * *', async () => {
  try {
    await autoGenerateReorderPOs();
  } catch (error) {
    console.error('[Scheduler] Auto-reorder error:', error);
  }
});

// Export functions for manual trigger
export { generateInventoryAlerts, autoGenerateReorderPOs };

// Combined scheduler object
const scheduler = {
  social: socialScheduler,
  inventoryAlerts: inventoryAlertScheduler,
  autoReorder: autoReorderScheduler,
  start: () => {
    socialScheduler.start();
    inventoryAlertScheduler.start();
    autoReorderScheduler.start();
    console.log('[Scheduler] All schedulers started');
  },
  stop: () => {
    socialScheduler.stop();
    inventoryAlertScheduler.stop();
    autoReorderScheduler.stop();
    console.log('[Scheduler] All schedulers stopped');
  }
};

export default scheduler;
