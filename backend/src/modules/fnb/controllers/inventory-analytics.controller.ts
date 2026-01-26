import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';

/**
 * Recipe Costing - Calculate food cost per menu item
 * Based on: sum(ingredient.cost_per_unit × recipe.quantity)
 */
export const getRecipeCosts = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { outlet_id } = req.query;
    const where: any = { is_active: true };

    if (outlet_id) {
      where.outlet_id = parseInt(outlet_id as string);
    }

    // Get all items with their recipes
    const items = await prisma.items.findMany({
      where,
      include: {
        recipes: {
          include: {
            ingredients: {
              select: { id: true, name: true, cost_per_unit: true, unit: true }
            }
          }
        },
        categories: { select: { id: true, name: true } }
      },
      orderBy: { name: 'asc' }
    });

    const recipeCosts = items.map(item => {
      // Calculate total ingredient cost
      let ingredientCost = 0;
      const ingredientBreakdown: any[] = [];

      for (const recipe of item.recipes) {
        if (recipe.ingredients) {
          const qty = parseFloat(recipe.quantity.toString());
          const costPerUnit = parseFloat(recipe.ingredients.cost_per_unit?.toString() || '0');
          const lineCost = qty * costPerUnit;
          ingredientCost += lineCost;

          ingredientBreakdown.push({
            ingredientId: recipe.ingredients.id,
            ingredientName: recipe.ingredients.name,
            quantity: qty,
            unit: recipe.unit || recipe.ingredients.unit,
            costPerUnit,
            lineCost
          });
        }
      }

      const sellingPrice = parseFloat(item.price.toString());
      const foodCostPercent = sellingPrice > 0 ? (ingredientCost / sellingPrice) * 100 : 0;
      const grossProfit = sellingPrice - ingredientCost;
      const grossMargin = sellingPrice > 0 ? (grossProfit / sellingPrice) * 100 : 0;

      // Health indicator based on food cost %
      // Ideal: 28-35%, Warning: 35-40%, Critical: >40%
      let costHealth: 'good' | 'warning' | 'critical' = 'good';
      if (foodCostPercent > 40) costHealth = 'critical';
      else if (foodCostPercent > 35) costHealth = 'warning';

      return {
        itemId: item.id,
        itemName: item.name,
        category: item.categories?.name || 'Uncategorized',
        sellingPrice,
        ingredientCost: Math.round(ingredientCost * 100) / 100,
        foodCostPercent: Math.round(foodCostPercent * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        grossMargin: Math.round(grossMargin * 100) / 100,
        costHealth,
        ingredientBreakdown,
        hasRecipe: item.recipes.length > 0
      };
    });

    // Summary stats
    const itemsWithRecipe = recipeCosts.filter(r => r.hasRecipe);
    const avgFoodCost = itemsWithRecipe.length > 0
      ? itemsWithRecipe.reduce((sum, r) => sum + r.foodCostPercent, 0) / itemsWithRecipe.length
      : 0;

    res.json({
      success: true,
      data: recipeCosts,
      summary: {
        totalItems: recipeCosts.length,
        itemsWithRecipe: itemsWithRecipe.length,
        itemsWithoutRecipe: recipeCosts.length - itemsWithRecipe.length,
        avgFoodCostPercent: Math.round(avgFoodCost * 100) / 100,
        criticalItems: recipeCosts.filter(r => r.costHealth === 'critical').length,
        warningItems: recipeCosts.filter(r => r.costHealth === 'warning').length
      }
    });
  } catch (error) {
    return _next(error);
  }
};

/**
 * Update item cost based on recipe calculation
 */
export const recalculateItemCost = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;
    const itemId = parseInt(id);

    const item = await prisma.items.findUnique({
      where: { id: itemId },
      include: {
        recipes: {
          include: {
            ingredients: { select: { cost_per_unit: true } }
          }
        }
      }
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Item tidak ditemukan' }
      });
    }

    // Calculate total ingredient cost
    let totalCost = 0;
    for (const recipe of item.recipes) {
      if (recipe.ingredients) {
        const qty = parseFloat(recipe.quantity.toString());
        const costPerUnit = parseFloat(recipe.ingredients.cost_per_unit?.toString() || '0');
        totalCost += qty * costPerUnit;
      }
    }

    // Update item cost
    const updated = await prisma.items.update({
      where: { id: itemId },
      data: { cost: totalCost }
    });

    res.json({
      success: true,
      message: 'Item cost berhasil diupdate',
      data: {
        itemId,
        itemName: item.name,
        oldCost: parseFloat(item.cost?.toString() || '0'),
        newCost: totalCost
      }
    });
  } catch (error) {
    return _next(error);
  }
};

/**
 * Bulk recalculate all item costs
 */
export const recalculateAllItemCosts = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { outlet_id } = req.query;
    const where: any = { is_active: true };

    if (outlet_id) {
      where.outlet_id = parseInt(outlet_id as string);
    }

    const items = await prisma.items.findMany({
      where,
      include: {
        recipes: {
          include: {
            ingredients: { select: { cost_per_unit: true } }
          }
        }
      }
    });

    let updatedCount = 0;

    for (const item of items) {
      let totalCost = 0;
      for (const recipe of item.recipes) {
        if (recipe.ingredients) {
          const qty = parseFloat(recipe.quantity.toString());
          const costPerUnit = parseFloat(recipe.ingredients.cost_per_unit?.toString() || '0');
          totalCost += qty * costPerUnit;
        }
      }

      if (totalCost !== parseFloat(item.cost?.toString() || '0')) {
        await prisma.items.update({
          where: { id: item.id },
          data: { cost: totalCost }
        });
        updatedCount++;
      }
    }

    res.json({
      success: true,
      message: `${updatedCount} item costs berhasil diupdate`,
      data: { totalItems: items.length, updatedItems: updatedCount }
    });
  } catch (error) {
    return _next(error);
  }
};

/**
 * Actual vs Theoretical Analysis
 * Theoretical = sum(transaction_items.quantity × recipe.ingredient.quantity)
 * Actual = stock movements (OUT type)
 */
export const getActualVsTheoretical = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { outlet_id, start_date, end_date } = req.query;

    // Default to current month
    const startDate = start_date
      ? new Date(start_date as string)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = end_date
      ? new Date(end_date as string)
      : new Date();

    const outletFilter = outlet_id ? parseInt(outlet_id as string) : undefined;

    // Get all completed transactions in period
    const transactions = await prisma.transactions.findMany({
      where: {
        status: 'completed',
        created_at: { gte: startDate, lte: endDate },
        ...(outletFilter && { outlet_id: outletFilter })
      },
      include: {
        transaction_items: {
          include: {
            items: {
              include: {
                recipes: {
                  include: {
                    ingredients: { select: { id: true, name: true, unit: true } }
                  }
                }
              }
            }
          }
        }
      }
    });

    // Calculate theoretical usage per ingredient
    const theoreticalUsage: Record<number, { name: string; unit: string; quantity: number }> = {};

    for (const txn of transactions) {
      for (const item of txn.transaction_items) {
        if (!item.items?.recipes) continue;

        const soldQty = parseFloat(item.quantity.toString());

        for (const recipe of item.items.recipes) {
          if (!recipe.ingredients) continue;

          const ingredientId = recipe.ingredient_id;
          const recipeQty = parseFloat(recipe.quantity.toString());
          const theoreticalQty = soldQty * recipeQty;

          if (!theoreticalUsage[ingredientId]) {
            theoreticalUsage[ingredientId] = {
              name: recipe.ingredients.name,
              unit: recipe.unit || recipe.ingredients.unit,
              quantity: 0
            };
          }
          theoreticalUsage[ingredientId].quantity += theoreticalQty;
        }
      }
    }

    // Get actual stock movements (OUT) in period
    const stockMovements = await prisma.stock_movements.findMany({
      where: {
        type: { in: ['OUT', 'adjustment_out'] },
        created_at: { gte: startDate, lte: endDate },
        ingredient_id: { not: null },
        ...(outletFilter && { outlet_id: outletFilter })
      },
      include: {
        ingredients: { select: { id: true, name: true, unit: true } }
      }
    });

    // Calculate actual usage per ingredient
    const actualUsage: Record<number, { name: string; unit: string; quantity: number }> = {};

    for (const movement of stockMovements) {
      if (!movement.ingredient_id) continue;

      const ingredientId = movement.ingredient_id;
      const qty = parseFloat(movement.quantity.toString());

      if (!actualUsage[ingredientId]) {
        actualUsage[ingredientId] = {
          name: movement.ingredients?.name || 'Unknown',
          unit: movement.ingredients?.unit || '',
          quantity: 0
        };
      }
      actualUsage[ingredientId].quantity += qty;
    }

    // Combine and calculate variance
    const allIngredientIds = new Set([
      ...Object.keys(theoreticalUsage).map(Number),
      ...Object.keys(actualUsage).map(Number)
    ]);

    const varianceReport: any[] = [];

    for (const ingredientId of allIngredientIds) {
      const theo = theoreticalUsage[ingredientId];
      const actual = actualUsage[ingredientId];

      const theoreticalQty = theo?.quantity || 0;
      const actualQty = actual?.quantity || 0;
      const variance = actualQty - theoreticalQty;
      const variancePercent = theoreticalQty > 0 ? (variance / theoreticalQty) * 100 : 0;

      // Health indicator: variance > 10% is critical, > 5% is warning
      let varianceHealth: 'good' | 'warning' | 'critical' = 'good';
      if (Math.abs(variancePercent) > 10) varianceHealth = 'critical';
      else if (Math.abs(variancePercent) > 5) varianceHealth = 'warning';

      varianceReport.push({
        ingredientId,
        ingredientName: theo?.name || actual?.name || 'Unknown',
        unit: theo?.unit || actual?.unit || '',
        theoreticalUsage: Math.round(theoreticalQty * 100) / 100,
        actualUsage: Math.round(actualQty * 100) / 100,
        variance: Math.round(variance * 100) / 100,
        variancePercent: Math.round(variancePercent * 100) / 100,
        varianceHealth,
        possibleCause: variance > 0 ? 'Waste/Theft/Over-portioning' : variance < 0 ? 'Under-recording' : 'On target'
      });
    }

    // Sort by absolute variance descending
    varianceReport.sort((a, b) => Math.abs(b.variancePercent) - Math.abs(a.variancePercent));

    // Summary
    const criticalItems = varianceReport.filter(r => r.varianceHealth === 'critical');
    const totalTheoretical = varianceReport.reduce((sum, r) => sum + r.theoreticalUsage, 0);
    const totalActual = varianceReport.reduce((sum, r) => sum + r.actualUsage, 0);

    res.json({
      success: true,
      data: varianceReport,
      summary: {
        period: { startDate, endDate },
        totalIngredients: varianceReport.length,
        criticalVariances: criticalItems.length,
        warningVariances: varianceReport.filter(r => r.varianceHealth === 'warning').length,
        overallVariancePercent: totalTheoretical > 0
          ? Math.round(((totalActual - totalTheoretical) / totalTheoretical) * 10000) / 100
          : 0,
        potentialWasteValue: criticalItems.reduce((sum, r) => sum + Math.max(0, r.variance), 0)
      }
    });
  } catch (error) {
    return _next(error);
  }
};

/**
 * Menu Engineering Matrix
 * Stars: High Profit, High Popularity
 * Plowhorses: Low Profit, High Popularity
 * Puzzles: High Profit, Low Popularity
 * Dogs: Low Profit, Low Popularity
 */
export const getMenuEngineering = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { outlet_id, start_date, end_date } = req.query;

    // Default to last 30 days
    const startDate = start_date
      ? new Date(start_date as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end_date
      ? new Date(end_date as string)
      : new Date();

    const outletFilter = outlet_id ? parseInt(outlet_id as string) : undefined;

    // Get all items with their sales data
    const items = await prisma.items.findMany({
      where: {
        is_active: true,
        ...(outletFilter && { outlet_id: outletFilter })
      },
      include: {
        categories: { select: { name: true } },
        recipes: {
          include: {
            ingredients: { select: { cost_per_unit: true } }
          }
        }
      }
    });

    // Get sales data from transaction_items
    const salesData = await prisma.transaction_items.groupBy({
      by: ['item_id'],
      where: {
        transactions: {
          status: 'completed',
          created_at: { gte: startDate, lte: endDate },
          ...(outletFilter && { outlet_id: outletFilter })
        }
      },
      _sum: { quantity: true, subtotal: true },
      _count: { id: true }
    });

    // Create sales map
    const salesMap = new Map(salesData.map(s => [
      s.item_id,
      {
        quantity: parseFloat(s._sum.quantity?.toString() || '0'),
        revenue: parseFloat(s._sum.subtotal?.toString() || '0'),
        orderCount: s._count.id
      }
    ]));

    // Calculate metrics for each item
    const menuItems = items.map(item => {
      const sales = salesMap.get(item.id) || { quantity: 0, revenue: 0, orderCount: 0 };

      // Calculate food cost from recipe
      let foodCost = parseFloat(item.cost?.toString() || '0');
      if (item.recipes.length > 0) {
        foodCost = 0;
        for (const recipe of item.recipes) {
          if (recipe.ingredients) {
            const qty = parseFloat(recipe.quantity.toString());
            const costPerUnit = parseFloat(recipe.ingredients.cost_per_unit?.toString() || '0');
            foodCost += qty * costPerUnit;
          }
        }
      }

      const sellingPrice = parseFloat(item.price.toString());
      const grossProfit = sellingPrice - foodCost;
      const profitMargin = sellingPrice > 0 ? (grossProfit / sellingPrice) * 100 : 0;
      const totalProfit = grossProfit * sales.quantity;

      return {
        itemId: item.id,
        itemName: item.name,
        category: item.categories?.name || 'Uncategorized',
        sellingPrice,
        foodCost: Math.round(foodCost * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        profitMargin: Math.round(profitMargin * 100) / 100,
        quantitySold: sales.quantity,
        revenue: Math.round(sales.revenue * 100) / 100,
        totalProfit: Math.round(totalProfit * 100) / 100,
        orderCount: sales.orderCount
      };
    });

    // Calculate averages for classification
    const itemsWithSales = menuItems.filter(m => m.quantitySold > 0);
    const avgProfitMargin = itemsWithSales.length > 0
      ? itemsWithSales.reduce((sum, m) => sum + m.profitMargin, 0) / itemsWithSales.length
      : 30; // Default 30% if no sales

    const avgQuantitySold = itemsWithSales.length > 0
      ? itemsWithSales.reduce((sum, m) => sum + m.quantitySold, 0) / itemsWithSales.length
      : 0;

    // Classify items into matrix
    const classifiedItems = menuItems.map(item => {
      const highProfit = item.profitMargin >= avgProfitMargin;
      const highPopularity = item.quantitySold >= avgQuantitySold;

      let classification: 'star' | 'plowhorse' | 'puzzle' | 'dog' | 'new';
      let recommendation: string;

      if (item.quantitySold === 0) {
        classification = 'new';
        recommendation = 'Butuh promosi atau evaluasi apakah masih relevan';
      } else if (highProfit && highPopularity) {
        classification = 'star';
        recommendation = 'Pertahankan! Ini menu andalan Anda';
      } else if (!highProfit && highPopularity) {
        classification = 'plowhorse';
        recommendation = 'Naikkan harga atau kurangi porsi untuk tingkatkan margin';
      } else if (highProfit && !highPopularity) {
        classification = 'puzzle';
        recommendation = 'Tingkatkan promosi, tempatkan di posisi strategis menu';
      } else {
        classification = 'dog';
        recommendation = 'Pertimbangkan untuk dihapus atau reformulasi total';
      }

      return {
        ...item,
        classification,
        recommendation
      };
    });

    // Group by classification
    const matrix = {
      stars: classifiedItems.filter(i => i.classification === 'star'),
      plowhorses: classifiedItems.filter(i => i.classification === 'plowhorse'),
      puzzles: classifiedItems.filter(i => i.classification === 'puzzle'),
      dogs: classifiedItems.filter(i => i.classification === 'dog'),
      new: classifiedItems.filter(i => i.classification === 'new')
    };

    // Summary stats
    const totalRevenue = menuItems.reduce((sum, m) => sum + m.revenue, 0);
    const totalProfit = menuItems.reduce((sum, m) => sum + m.totalProfit, 0);

    res.json({
      success: true,
      data: classifiedItems,
      matrix,
      summary: {
        period: { startDate, endDate },
        totalItems: menuItems.length,
        itemsWithSales: itemsWithSales.length,
        avgProfitMargin: Math.round(avgProfitMargin * 100) / 100,
        avgQuantitySold: Math.round(avgQuantitySold * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalProfit: Math.round(totalProfit * 100) / 100,
        overallProfitMargin: totalRevenue > 0
          ? Math.round((totalProfit / totalRevenue) * 10000) / 100
          : 0,
        counts: {
          stars: matrix.stars.length,
          plowhorses: matrix.plowhorses.length,
          puzzles: matrix.puzzles.length,
          dogs: matrix.dogs.length,
          new: matrix.new.length
        }
      }
    });
  } catch (error) {
    return _next(error);
  }
};

/**
 * COGS Summary Report
 */
export const getCOGSSummary = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { outlet_id, start_date, end_date } = req.query;

    const startDate = start_date
      ? new Date(start_date as string)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = end_date
      ? new Date(end_date as string)
      : new Date();

    const outletFilter = outlet_id ? parseInt(outlet_id as string) : undefined;

    // Get total revenue
    const revenueData = await prisma.transactions.aggregate({
      where: {
        status: 'completed',
        created_at: { gte: startDate, lte: endDate },
        ...(outletFilter && { outlet_id: outletFilter })
      },
      _sum: { total: true }
    });

    // Get stock purchases (IN movements)
    const purchaseData = await prisma.stock_movements.aggregate({
      where: {
        type: 'IN',
        created_at: { gte: startDate, lte: endDate },
        ...(outletFilter && { outlet_id: outletFilter })
      },
      _sum: { total_cost: true }
    });

    // Get beginning and ending inventory values
    // This is simplified - ideally tracked via periodic snapshots
    const currentInventoryValue = await prisma.inventory.aggregate({
      where: {
        is_active: true,
        ...(outletFilter && { outlet_id: outletFilter })
      },
      _sum: { current_stock: true, cost_amount: true }
    });

    const currentIngredientValue = await prisma.ingredients.aggregate({
      where: {
        is_active: true,
        ...(outletFilter && { outlet_id: outletFilter })
      },
      _sum: { stock: true, cost_per_unit: true }
    });

    const totalRevenue = parseFloat(revenueData._sum.total?.toString() || '0');
    const totalPurchases = parseFloat(purchaseData._sum.total_cost?.toString() || '0');

    // Simplified COGS calculation
    // COGS = Beginning Inventory + Purchases - Ending Inventory
    // For simplicity, we use purchases as proxy for COGS
    const estimatedCOGS = totalPurchases;
    const grossProfit = totalRevenue - estimatedCOGS;
    const grossProfitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const foodCostPercent = totalRevenue > 0 ? (estimatedCOGS / totalRevenue) * 100 : 0;

    res.json({
      success: true,
      data: {
        period: { startDate, endDate },
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalPurchases: Math.round(totalPurchases * 100) / 100,
        estimatedCOGS: Math.round(estimatedCOGS * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        grossProfitMargin: Math.round(grossProfitMargin * 100) / 100,
        foodCostPercent: Math.round(foodCostPercent * 100) / 100,
        healthIndicator: foodCostPercent <= 30 ? 'excellent' : foodCostPercent <= 35 ? 'good' : foodCostPercent <= 40 ? 'warning' : 'critical'
      }
    });
  } catch (error) {
    return _next(error);
  }
};
