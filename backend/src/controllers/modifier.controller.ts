import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

export const getModifiers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const where: any = { isActive: true };
    const modifiers = await prisma.modifier.findMany({
      where,
      include: { items: { include: { item: true } } },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: modifiers, count: modifiers.length });
  } catch (error) {
    next(error);
  }
};

export const createModifier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, price, category } = req.body;
    if (!name) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Modifier name is required' }
      });
    }
    const modifier = await prisma.modifier.create({
      data: { name, price: price || 0, category }
    });
    res.status(201).json({ success: true, data: modifier, message: 'Modifier created successfully' });
  } catch (error) {
    next(error);
  }
};

export const updateModifier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, price, category, isActive } = req.body;
    const modifier = await prisma.modifier.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(price !== undefined && { price }),
        ...(category && { category }),
        ...(isActive !== undefined && { isActive })
      }
    });
    res.json({ success: true, data: modifier, message: 'Modifier updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const deleteModifier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.modifier.update({
      where: { id: parseInt(id) },
      data: { isActive: false }
    });
    res.json({ success: true, message: 'Modifier deleted successfully' });
  } catch (error) {
    next(error);
  }
};
