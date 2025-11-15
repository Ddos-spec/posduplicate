import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

export const getIngredients = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { outlet_id, category_id } = req.query;
    const where: any = { isActive: true };

    if (req.tenantId) {
      where.outlet = { tenantId: req.tenantId };
    }
    if (outlet_id) where.outletId = parseInt(outlet_id as string);
    if (category_id) where.categoryId = parseInt(category_id as string);

    const ingredients = await prisma.ingredients.findMany({
      where,
      include: {
        category: true,
        outlet: { select: { id: true, name: true } }
      },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: ingredients, count: ingredients.length });
  } catch (error) {
    _next(error);
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
        categoryId,
        unit: unit || 'pcs',
        stock: stock || 0,
        minStock: minStock || 0,
        cost: cost || 0,
        outletId
      }
    });
    res.status(201).json({ success: true, data: ingredient, message: 'Ingredient created successfully' });
  } catch (error) {
    _next(error);
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
        ...(minStock !== undefined && { minStock }),
        ...(cost !== undefined && { cost }),
        ...(isActive !== undefined && { isActive })
      }
    });
    res.json({ success: true, data: ingredient, message: 'Ingredient updated successfully' });
  } catch (error) {
    _next(error);
  }
};

export const deleteIngredient = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.ingredients.update({
      where: { id: parseInt(id) },
      data: { isActive: false }
    });
    res.json({ success: true, message: 'Ingredient deleted successfully' });
  } catch (error) {
    _next(error);
  }
};
