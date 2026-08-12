import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../../utils/prisma';

const requireTenant = (req: Request) => {
  if (!req.tenantId) throw Object.assign(new Error('Tenant context is required'), { status: 400, code: 'TENANT_REQUIRED' });
  return req.tenantId;
};

const assertOutlet = async (tenantId: number, outletId: number) => {
  const outlet = await prisma.outlets.findFirst({ where: { id: outletId, tenant_id: tenantId }, select: { id: true } });
  if (!outlet) throw Object.assign(new Error('Outlet bukan milik tenant ini'), { status: 403, code: 'OUTLET_ACCESS_DENIED' });
};

const lockTenantInventoryMutation = async (tx: any, tenantId: number) => {
  await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${tenantId}, 73001)`);
};

const validateConsumptionSnapshot = (consumption: any) => {
  const planned = Number(consumption.quantity_planned);
  const alreadyConsumed = Number(consumption.quantity_consumed || 0);
  if (!Number.isFinite(planned) || planned <= 0 || !Number.isFinite(alreadyConsumed) || alreadyConsumed < 0 || alreadyConsumed > planned) {
    throw Object.assign(new Error(`Material consumption snapshot ${consumption.id} tidak valid`), { status: 409, code: 'MATERIAL_CONSUMPTION_INVALID' });
  }
  return { planned, alreadyConsumed, remaining: planned - alreadyConsumed };
};

const consumeIngredientAtomically = async (tx: any, ingredientId: number, outletId: number, quantity: number, moNumber: string) => {
  const updated = await tx.$queryRaw<any[]>(Prisma.sql`
    UPDATE public.ingredients
    SET stock = COALESCE(stock, 0) - ${quantity}, updated_at = NOW()
    WHERE id = ${ingredientId}
      AND outlet_id = ${outletId}
      AND COALESCE(is_active, TRUE) = TRUE
      AND COALESCE(stock, 0) >= ${quantity}
    RETURNING id, name, cost_per_unit, stock + ${quantity} AS stock_before, stock AS stock_after
  `);
  if (updated[0]) return updated[0];

  const existing = await tx.ingredients.findFirst({ where: { id: ingredientId, outlet_id: outletId, is_active: true } });
  if (!existing) throw Object.assign(new Error(`Ingredient ${ingredientId} tidak ditemukan`), { status: 404, code: 'INGREDIENT_NOT_FOUND' });
  throw Object.assign(new Error(`Stock ${existing.name} tidak cukup untuk MO ${moNumber}`), { status: 409, code: 'INSUFFICIENT_MATERIAL' });
};

const consumeInventoryAtomically = async (tx: any, inventoryId: number, outletId: number, quantity: number) => {
  const updated = await tx.$queryRaw<any[]>(Prisma.sql`
    UPDATE public.inventory
    SET current_stock = current_stock - ${quantity}, updated_at = NOW()
    WHERE id = ${inventoryId}
      AND outlet_id = ${outletId}
      AND is_active = TRUE
      AND current_stock >= ${quantity}
    RETURNING id, name, cost_amount, current_stock + ${quantity} AS stock_before, current_stock AS stock_after
  `);
  if (updated[0]) return updated[0];

  const existing = await tx.inventory.findFirst({ where: { id: inventoryId, outlet_id: outletId, is_active: true } });
  if (!existing) throw Object.assign(new Error(`Inventory ${inventoryId} tidak ditemukan`), { status: 404, code: 'INVENTORY_NOT_FOUND' });
  throw Object.assign(new Error(`Stock ${existing.name} tidak cukup`), { status: 409, code: 'INSUFFICIENT_MATERIAL' });
};

const postTrackedFinishedGoodsAtomically = async (tx: any, itemId: number, outletId: number, quantity: number) => {
  const updated = await tx.$queryRaw<any[]>(Prisma.sql`
    UPDATE public.items
    SET stock = COALESCE(stock, 0) + ${quantity}, updated_at = NOW()
    WHERE id = ${itemId}
      AND outlet_id = ${outletId}
      AND COALESCE(is_active, TRUE) = TRUE
      AND COALESCE(track_stock, FALSE) = TRUE
    RETURNING id, name, stock - ${quantity} AS stock_before, stock AS stock_after
  `);
  if (!updated[0]) throw Object.assign(new Error('Finished product stock gagal diposting'), { status: 409, code: 'ITEM_OUTPUT_POST_FAILED' });
  return updated[0];
};

export const getManufacturingOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT mo.*, i.name AS item_name, i.price AS item_price,
        COALESCE((SELECT json_agg(json_build_object(
          'id', c.id,
          'ingredientId', c.ingredient_id,
          'inventoryId', c.inventory_id,
          'ingredientName', ing.name,
          'inventoryName', inv.name,
          'quantityPlanned', c.quantity_planned,
          'quantityConsumed', c.quantity_consumed,
          'unitCost', c.unit_cost
        ) ORDER BY c.id)
        FROM public.manufacturing_consumptions c
        LEFT JOIN public.ingredients ing ON ing.id = c.ingredient_id
        LEFT JOIN public.inventory inv ON inv.id = c.inventory_id
        WHERE c.manufacturing_order_id = mo.id), '[]'::json) AS consumptions
      FROM public.manufacturing_orders mo
      LEFT JOIN public.items i ON i.id = mo.item_id
      WHERE mo.tenant_id = ${tenantId}
      ORDER BY mo.created_at DESC
    `);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) {
    next(error);
  }
};

export const createManufacturingOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const outletId = Number(req.body.outletId);
    const itemId = Number(req.body.itemId);
    const quantityPlanned = Number(req.body.quantityPlanned);
    if (!outletId || !itemId || !Number.isFinite(quantityPlanned) || quantityPlanned <= 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Outlet, item dan quantity planned wajib valid' } });
    }

    let scheduledAt: Date | null = null;
    if (req.body.scheduledAt) {
      scheduledAt = new Date(req.body.scheduledAt);
      if (Number.isNaN(scheduledAt.getTime())) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_SCHEDULED_AT', message: 'Scheduled at tidak valid' } });
      }
    }

    await assertOutlet(tenantId, outletId);
    const item = await prisma.items.findFirst({ where: { id: itemId, outlet_id: outletId, is_active: true } });
    if (!item) return res.status(404).json({ success: false, error: { code: 'ITEM_NOT_FOUND', message: 'Finished product tidak ditemukan di outlet' } });

    const recipes = await prisma.recipes.findMany({
      where: { item_id: itemId },
      include: { ingredients: true }
    });
    if (recipes.length === 0) return res.status(409).json({ success: false, error: { code: 'BOM_REQUIRED', message: 'Product belum memiliki recipe/BOM' } });

    const invalidIngredient = recipes.find((recipe) => recipe.ingredients.outlet_id !== outletId || !recipe.ingredients.is_active);
    if (invalidIngredient) {
      return res.status(409).json({
        success: false,
        error: { code: 'BOM_INGREDIENT_INVALID', message: 'Recipe memakai ingredient inactive atau dari outlet lain' }
      });
    }
    const invalidQuantity = recipes.find((recipe) => !Number.isFinite(Number(recipe.quantity)) || Number(recipe.quantity) <= 0);
    if (invalidQuantity) {
      return res.status(409).json({ success: false, error: { code: 'BOM_QUANTITY_INVALID', message: 'Recipe memiliki quantity material yang tidak valid' } });
    }

    const created = await prisma.$transaction(async (tx) => {
      const sequence = await tx.$queryRaw<Array<{ seq: bigint }>>(Prisma.sql`SELECT nextval('public.manufacturing_order_number_seq') AS seq`);
      const moNumber = `MO-${new Date().getFullYear()}-${String(Number(sequence[0].seq)).padStart(6, '0')}`;
      const rows = await tx.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO public.manufacturing_orders
          (tenant_id, outlet_id, mo_number, item_id, quantity_planned, status, scheduled_at, notes, created_by)
        VALUES
          (${tenantId}, ${outletId}, ${moNumber}, ${itemId}, ${quantityPlanned}, 'draft', ${scheduledAt}, ${req.body.notes || null}, ${req.userId || null})
        RETURNING *
      `);
      for (const recipe of recipes) {
        const planned = Number(recipe.quantity) * quantityPlanned;
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO public.manufacturing_consumptions
            (manufacturing_order_id, ingredient_id, quantity_planned, unit_cost)
          VALUES
            (${rows[0].id}, ${recipe.ingredient_id}, ${planned}, ${Number(recipe.ingredients.cost_per_unit || 0)})
        `);
      }
      return rows[0];
    });
    res.status(201).json({ success: true, data: created, message: 'Manufacturing order created from validated recipe snapshot' });
  } catch (error) {
    next(error);
  }
};

export const transitionManufacturingOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const id = Number(req.params.id);
    const action = String(req.body.action || '');
    const allowed: Record<string, { from: string[]; status: string }> = {
      confirm: { from: ['draft'], status: 'confirmed' },
      start: { from: ['confirmed'], status: 'in_progress' },
      cancel: { from: ['draft', 'confirmed'], status: 'cancelled' }
    };
    const transition = allowed[action];
    if (!transition) return res.status(409).json({ success: false, error: { code: 'INVALID_MO_TRANSITION', message: `Action ${action} tidak valid` } });

    const updated = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.manufacturing_orders WHERE id = ${id} AND tenant_id = ${tenantId} FOR UPDATE`);
      const mo = rows[0];
      if (!mo) throw Object.assign(new Error('Manufacturing order tidak ditemukan'), { status: 404, code: 'MO_NOT_FOUND' });
      if (!transition.from.includes(mo.status)) {
        throw Object.assign(new Error(`Action ${action} tidak valid dari status ${mo.status}`), { status: 409, code: 'INVALID_MO_TRANSITION' });
      }
      const result = await tx.$queryRaw<any[]>(Prisma.sql`
        UPDATE public.manufacturing_orders
        SET status = ${transition.status},
            started_at = CASE WHEN ${transition.status} = 'in_progress' THEN NOW() ELSE started_at END,
            updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `);
      return result[0];
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const completeManufacturingOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const id = Number(req.params.id);
    const quantityProducedInput = req.body.quantityProduced === undefined ? null : Number(req.body.quantityProduced);

    const result = await prisma.$transaction(async (tx) => {
      await lockTenantInventoryMutation(tx, tenantId);
      const rows = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.manufacturing_orders WHERE id = ${id} AND tenant_id = ${tenantId} FOR UPDATE`);
      const mo = rows[0];
      if (!mo) throw Object.assign(new Error('Manufacturing order tidak ditemukan'), { status: 404, code: 'MO_NOT_FOUND' });
      if (mo.status !== 'in_progress') throw Object.assign(new Error('Manufacturing order harus in_progress sebelum completion'), { status: 409, code: 'INVALID_MO_STATUS' });
      const quantityProduced = quantityProducedInput === null ? Number(mo.quantity_planned) : quantityProducedInput;
      if (!Number.isFinite(quantityProduced) || quantityProduced < 0) throw Object.assign(new Error('Quantity produced tidak valid'), { status: 400, code: 'INVALID_PRODUCTION_QTY' });

      const consumptions = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.manufacturing_consumptions WHERE manufacturing_order_id = ${id} ORDER BY id FOR UPDATE`);
      for (const consumption of consumptions) {
        const { alreadyConsumed, remaining } = validateConsumptionSnapshot(consumption);
        if (remaining <= 0) continue;

        if (consumption.ingredient_id) {
          const ingredient = await consumeIngredientAtomically(tx, Number(consumption.ingredient_id), Number(mo.outlet_id), remaining, mo.mo_number);
          const unitCost = Number(ingredient.cost_per_unit || consumption.unit_cost || 0);
          await tx.stock_movements.create({
            data: {
              outlet_id: Number(mo.outlet_id),
              ingredient_id: ingredient.id,
              type: 'OUT',
              quantity: remaining,
              unit_price: unitCost,
              total_cost: remaining * unitCost,
              stock_before: Number(ingredient.stock_before),
              stock_after: Number(ingredient.stock_after),
              notes: `Manufacturing consumption ${mo.mo_number}`,
              user_id: req.userId!
            }
          });
          await tx.$executeRaw(Prisma.sql`UPDATE public.manufacturing_consumptions SET quantity_consumed = ${alreadyConsumed + remaining} WHERE id = ${consumption.id}`);
        } else if (consumption.inventory_id) {
          const inv = await consumeInventoryAtomically(tx, Number(consumption.inventory_id), Number(mo.outlet_id), remaining);
          const unitCost = Number(inv.cost_amount || consumption.unit_cost || 0);
          await tx.stock_movements.create({
            data: {
              outlet_id: Number(mo.outlet_id),
              inventory_id: inv.id,
              type: 'OUT',
              quantity: remaining,
              unit_price: unitCost,
              total_cost: remaining * unitCost,
              stock_before: Number(inv.stock_before),
              stock_after: Number(inv.stock_after),
              notes: `Manufacturing consumption ${mo.mo_number}`,
              user_id: req.userId!
            }
          });
          await tx.$executeRaw(Prisma.sql`UPDATE public.manufacturing_consumptions SET quantity_consumed = ${alreadyConsumed + remaining} WHERE id = ${consumption.id}`);
        } else {
          throw Object.assign(new Error(`Material consumption ${consumption.id} tidak memiliki sumber stok`), { status: 409, code: 'MATERIAL_SOURCE_MISSING' });
        }
      }

      const product = await tx.items.findFirst({ where: { id: Number(mo.item_id), outlet_id: Number(mo.outlet_id), is_active: true } });
      if (!product) throw Object.assign(new Error('Finished product tidak ditemukan'), { status: 404, code: 'ITEM_NOT_FOUND' });
      if (product.track_stock && quantityProduced > 0) {
        const postedProduct = await postTrackedFinishedGoodsAtomically(tx, product.id, Number(mo.outlet_id), quantityProduced);
        await tx.stock_movements.create({
          data: {
            outlet_id: Number(mo.outlet_id),
            item_id: product.id,
            type: 'IN',
            quantity: quantityProduced,
            unit_price: 0,
            total_cost: 0,
            stock_before: Number(postedProduct.stock_before),
            stock_after: Number(postedProduct.stock_after),
            notes: `Manufacturing output ${mo.mo_number}`,
            user_id: req.userId!
          }
        });
      }

      const updated = await tx.$queryRaw<any[]>(Prisma.sql`
        UPDATE public.manufacturing_orders
        SET status = 'done', quantity_produced = ${quantityProduced}, completed_by = ${req.userId || null}, completed_at = NOW(), updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `);
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO public.quality_checks (tenant_id, outlet_id, check_type, reference_type, reference_id, item_id, status, criteria, notes, created_by)
        VALUES (${tenantId}, ${Number(mo.outlet_id)}, 'production_output', 'manufacturing_order', ${String(id)}, ${Number(mo.item_id)}, 'pending', CAST(${JSON.stringify({ quantityProduced })} AS jsonb), ${`Auto QC from ${mo.mo_number}`}, ${req.userId || null})
      `);
      return updated[0];
    });

    res.json({ success: true, data: result, message: 'Manufacturing completed; materials consumed, output posted, QC created' });
  } catch (error) {
    next(error);
  }
};
