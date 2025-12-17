import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';

export const getModifiers = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    // If activeOnly query param is true, filter by active only
    const activeOnly = req.query.activeOnly === 'true';
    const where: any = activeOnly ? { is_active: true } : {};

    const modifiers = await prisma.modifiers.findMany({
      where,
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: modifiers, count: modifiers.length });
  } catch (error) {
    return _next(error);
  }
};

export const createModifier = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { name, price } = req.body;
    if (!name) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Modifier name is required' }
      });
    }
    const modifier = await prisma.modifiers.create({
      data: {
        name,
        price: price || 0,
        is_active: true // Default to active
      }
    });
    res.status(201).json({ success: true, data: modifier, message: 'Modifier created successfully' });
  } catch (error) {
    return _next(error);
  }
};

export const updateModifier = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, price, isActive } = req.body;
    const modifier = await prisma.modifiers.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(price !== undefined && { price }),
        ...(isActive !== undefined && { is_active: isActive })
      }
    });
    res.json({ success: true, data: modifier, message: 'Modifier updated successfully' });
  } catch (error) {
    return _next(error);
  }
};

export const deleteModifier = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.modifiers.update({
      where: { id: parseInt(id) },
      data: { is_active: false }
    });
    res.json({ success: true, message: 'Modifier deleted successfully' });
  } catch (error) {
    return _next(error);
  }
};
