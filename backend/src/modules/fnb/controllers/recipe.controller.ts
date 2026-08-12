import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';

type RecipeLine = {
  ingredientId: number;
  quantity: number;
  unit: string;
};

const requireTenant = (req: Request) => {
  if (!req.tenantId) throw Object.assign(new Error('Tenant context is required'), { status: 400, code: 'TENANT_REQUIRED' });
  return req.tenantId;
};

const tenantOutletIds = async (tenantId: number) => {
  const outlets = await prisma.outlets.findMany({ where: { tenant_id: tenantId }, select: { id: true } });
  return outlets.map((outlet) => outlet.id);
};

const getTenantItem = async (tenantId: number, itemId: number) => {
  const outletIds = await tenantOutletIds(tenantId);
  return prisma.items.findFirst({ where: { id: itemId, outlet_id: { in: outletIds } } });
};

const assertTenantIngredients = async (tenantId: number, ingredientIds: number[]) => {
  if (ingredientIds.length === 0) return;
  const outletIds = await tenantOutletIds(tenantId);
  const ingredients = await prisma.ingredients.findMany({ where: { id: { in: ingredientIds }, outlet_id: { in: outletIds }, is_active: true }, select: { id: true, outlet_id: true } });
  if (ingredients.length !== new Set(ingredientIds).size) throw Object.assign(new Error('Ada ingredient yang tidak ditemukan atau bukan milik tenant ini'), { status: 400, code: 'INVALID_INGREDIENT' });
};

export const getRecipes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const outletIds = await tenantOutletIds(tenantId);
    const itemId = req.query.item_id ? Number(req.query.item_id) : null;
    if (itemId) {
      const item = await prisma.items.findFirst({ where: { id: itemId, outlet_id: { in: outletIds } }, select: { id: true } });
      if (!item) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });
    }
    const recipes = await prisma.recipes.findMany({
      where: { items: { outlet_id: { in: outletIds } }, ...(itemId && { item_id: itemId }) },
      include: { items: { select: { id: true, name: true, outlet_id: true } }, ingredients: { select: { id: true, name: true, unit: true, cost_per_unit: true, outlet_id: true } } }
    });
    res.json({ success: true, data: recipes, count: recipes.length });
  } catch (error) {
    next(error);
  }
};

export const getRecipeByItemId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const itemId = Number(req.params.itemId);
    if (!Number.isInteger(itemId) || itemId <= 0) return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid product ID' } });
    const item = await getTenantItem(tenantId, itemId);
    if (!item) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });
    const recipes = await prisma.recipes.findMany({ where: { item_id: itemId }, include: { ingredients: true } });
    res.json({ success: true, data: recipes });
  } catch (error) {
    next(error);
  }
};

export const updateProductRecipe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const itemId = Number(req.params.itemId);
    const ingredients = Array.isArray(req.body.ingredients) ? req.body.ingredients : null;
    if (!Number.isInteger(itemId) || itemId <= 0) return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid product ID' } });
    if (!ingredients) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Ingredients array is required' } });
    const item = await getTenantItem(tenantId, itemId);
    if (!item) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });

    const normalized: RecipeLine[] = ingredients.map((ingredient: any): RecipeLine => ({
      ingredientId: Number(ingredient.ingredientId),
      quantity: Number(ingredient.quantity),
      unit: String(ingredient.unit || '').trim()
    }));
    if (normalized.some((ingredient: RecipeLine) => !Number.isInteger(ingredient.ingredientId) || ingredient.ingredientId <= 0 || !Number.isFinite(ingredient.quantity) || ingredient.quantity <= 0 || !ingredient.unit)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_RECIPE_LINE', message: 'Ingredient, quantity dan unit harus valid' } });
    }
    if (new Set(normalized.map((ingredient: RecipeLine) => ingredient.ingredientId)).size !== normalized.length) {
      return res.status(400).json({ success: false, error: { code: 'DUPLICATE_INGREDIENT', message: 'Ingredient tidak boleh duplikat pada BOM yang sama' } });
    }
    await assertTenantIngredients(tenantId, normalized.map((ingredient: RecipeLine) => ingredient.ingredientId));

    await prisma.$transaction(async (tx) => {
      await tx.recipes.deleteMany({ where: { item_id: itemId } });
      if (normalized.length > 0) {
        await tx.recipes.createMany({ data: normalized.map((ingredient: RecipeLine) => ({ item_id: itemId, ingredient_id: ingredient.ingredientId, quantity: ingredient.quantity, unit: ingredient.unit })) });
      }
    });
    const updatedRecipe = await prisma.recipes.findMany({ where: { item_id: itemId }, include: { ingredients: true } });
    res.json({ success: true, data: updatedRecipe, message: 'Recipe updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const addRecipeItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const itemId = Number(req.body.itemId);
    const ingredientId = Number(req.body.ingredientId);
    const quantity = Number(req.body.quantity);
    const unit = String(req.body.unit || '').trim();
    if (!Number.isInteger(itemId) || !Number.isInteger(ingredientId) || quantity <= 0 || !unit) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'itemId, ingredientId, quantity dan unit wajib valid' } });
    const item = await getTenantItem(tenantId, itemId);
    if (!item) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });
    await assertTenantIngredients(tenantId, [ingredientId]);
    const duplicate = await prisma.recipes.findFirst({ where: { item_id: itemId, ingredient_id: ingredientId } });
    if (duplicate) return res.status(409).json({ success: false, error: { code: 'DUPLICATE_INGREDIENT', message: 'Ingredient sudah ada pada BOM' } });
    const recipe = await prisma.recipes.create({ data: { item_id: itemId, ingredient_id: ingredientId, quantity, unit } });
    res.status(201).json({ success: true, data: recipe });
  } catch (error) {
    next(error);
  }
};

export const deleteRecipeItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const id = Number(req.params.id);
    const outletIds = await tenantOutletIds(tenantId);
    const recipe = await prisma.recipes.findFirst({ where: { id, items: { outlet_id: { in: outletIds } } }, select: { id: true } });
    if (!recipe) return res.status(404).json({ success: false, error: { code: 'RECIPE_NOT_FOUND', message: 'Recipe item not found' } });
    await prisma.recipes.delete({ where: { id } });
    res.json({ success: true, message: 'Recipe item deleted' });
  } catch (error) {
    next(error);
  }
};
