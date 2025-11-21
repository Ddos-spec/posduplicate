import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

/**
 * Get all recipes
 */
export const getRecipes = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { item_id } = req.query;
    const where: any = {};

    if (item_id) where.item_id = parseInt(item_id as string);

    const recipes = await prisma.recipes.findMany({
      where,
      include: {
        items: { select: { id: true, name: true } },
        ingredients: { select: { id: true, name: true, unit: true, cost_per_unit: true } }
      }
    });
    res.json({ success: true, data: recipes, count: recipes.length });
  } catch (error) {
    return _next(error);
  }
};

/**
 * Get recipe by Item ID (Product)
 */
export const getRecipeByItemId = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { itemId } = req.params;

    // Validate itemId
    const itemIdNum = parseInt(itemId);
    if (isNaN(itemIdNum)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid product ID' }
      });
    }

    // Check if item exists first
    const item = await prisma.items.findUnique({
      where: { id: itemIdNum }
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found' }
      });
    }

    const recipes = await prisma.recipes.findMany({
      where: { item_id: itemIdNum },
      include: {
        ingredients: true
      }
    });
    res.json({ success: true, data: recipes });
  } catch (error) {
    console.error('Error in getRecipeByItemId:', error);
    return _next(error);
  }
};

/**
 * Create or Update Recipe (Batch update for a product)
 */
export const updateProductRecipe = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { itemId } = req.params;
    const { ingredients } = req.body; // Array of { ingredientId, quantity, unit }

    // Validate itemId
    const itemIdNum = parseInt(itemId);
    if (isNaN(itemIdNum)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid product ID' }
      });
    }

    if (!ingredients || !Array.isArray(ingredients)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Ingredients array is required' }
      });
    }

    // Check if item exists first
    const item = await prisma.items.findUnique({
      where: { id: itemIdNum }
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found' }
      });
    }

    // Transaction to delete old recipe items and add new ones
    await prisma.$transaction(async (tx) => {
        // Delete existing recipe for this item
        await tx.recipes.deleteMany({
            where: { item_id: itemIdNum }
        });

        // Create new recipe items
        if (ingredients.length > 0) {
            await tx.recipes.createMany({
                data: ingredients.map((ing: any) => ({
                    item_id: itemIdNum,
                    ingredient_id: ing.ingredientId,
                    quantity: ing.quantity,
                    unit: ing.unit
                }))
            });
        }
    });

    const updatedRecipe = await prisma.recipes.findMany({
        where: { item_id: itemIdNum },
        include: { ingredients: true }
    });

    res.json({ success: true, data: updatedRecipe, message: 'Recipe updated successfully' });
  } catch (error) {
    console.error('Error in updateProductRecipe:', error);
    return _next(error);
  }
};

/**
 * Add single ingredient to recipe
 */
export const addRecipeItem = async (req: Request, res: Response, _next: NextFunction) => {
    try {
        const { itemId, ingredientId, quantity, unit } = req.body;

        const recipe = await prisma.recipes.create({
            data: {
                item_id: parseInt(itemId),
                ingredient_id: parseInt(ingredientId),
                quantity: quantity,
                unit: unit
            }
        });

        res.status(201).json({ success: true, data: recipe });
    } catch (error) {
        return _next(error);
    }
};

/**
 * Delete single ingredient from recipe
 */
export const deleteRecipeItem = async (req: Request, res: Response, _next: NextFunction) => {
    try {
        const { id } = req.params;
        await prisma.recipes.delete({
            where: { id: parseInt(id) }
        });
        res.json({ success: true, message: 'Recipe item deleted' });
    } catch (error) {
        return _next(error);
    }
};
