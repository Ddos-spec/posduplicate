import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';

export const getTables = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, outlet_id } = req.query;
    const where: any = { is_active: true };

    if (req.tenantId) {
      where.outlets = { tenantId: req.tenantId };
    }
    if (status) where.status = status;
    if (outlet_id) where.outlet_id = parseInt(outlet_id as string);

    const tables = await prisma.tables.findMany({
      where,
      include: { outlets: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' }
    });

    res.json({ success: true, data: tables, count: tables.length });
  } catch (error) {
    return next(error);
  }
};

export const getAvailableTables = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { outlet_id } = req.query;
    const where: any = { is_active: true, status: 'available' };

    if (req.tenantId) {
      where.outlets = { tenantId: req.tenantId };
    }
    if (outlet_id) where.outlet_id = parseInt(outlet_id as string);

    const tables = await prisma.tables.findMany({ where, orderBy: { name: 'asc' } });
    res.json({ success: true, data: tables, count: tables.length });
  } catch (error) {
    return next(error);
  }
};

export const updateTableStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const table = await prisma.tables.update({
      where: { id: parseInt(id) },
      data: { status }
    });

    res.json({ success: true, data: table, message: 'Table status updated' });
  } catch (error) {
    return next(error);
  }
};

export const createTable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, capacity, outletId } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Table name is required' }
      });
    }

    const table = await prisma.tables.create({
      data: { name, capacity: capacity || 4, outlet_id: outletId }
    });

    res.status(201).json({ success: true, data: table, message: 'Table created successfully' });
  } catch (error) {
    return next(error);
  }
};
