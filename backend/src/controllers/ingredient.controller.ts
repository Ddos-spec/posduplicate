import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

export const getIngredients = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { outlet_id, category_id } = req.query;
    const where: any = { is_active: true };

    if (req.tenantId) {
      where.outlets = { tenantId: req.tenantId };
    }
    if (outlet_id) where.outlet_id = parseInt(outlet_id as string);
    if (category_id) where.category_id = parseInt(category_id as string);

    const ingredients = await prisma.ingredients.findMany({
      where,
      include: {
        outlets: { select: { id: true, name: true } }
      },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: ingredients, count: ingredients.length });
  } catch (error) {
    return _next(error);
  }
};

export const createIngredient = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { name, categoryId, unit, stock, minStock, cost, outletId } = req.body;
    if (!name) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Ingredient name is required' }
      });
    }
    const ingredient = await prisma.ingredients.create({
      data: {
        name,
        category_id: categoryId,
        unit: unit || 'pcs',
        stock: stock || 0,
        min_stock: minStock || 0,
        cost_per_unit: cost || 0,
        outlet_id: outletId
      }
    });
    res.status(201).json({ success: true, data: ingredient, message: 'Ingredient created successfully' });
  } catch (error) {
    return _next(error);
  }
};

export const updateIngredient = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, unit, stock, minStock, cost, isActive } = req.body;
    const ingredient = await prisma.ingredients.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(unit && { unit }),
        ...(stock !== undefined && { stock }),
        ...(minStock !== undefined && { min_stock: minStock }),
        ...(cost !== undefined && { cost_per_unit: cost }),
        ...(isActive !== undefined && { is_active: isActive })
      }
    });
    res.json({ success: true, data: ingredient, message: 'Ingredient updated successfully' });
  } catch (error) {
    return _next(error);
  }
};

export const deleteIngredient = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.ingredients.update({
      where: { id: parseInt(id) },
      data: { is_active: false }
    });
    res.json({ success: true, message: 'Ingredient deleted successfully' });
  } catch (error) {
    return _next(error);
  }
};
