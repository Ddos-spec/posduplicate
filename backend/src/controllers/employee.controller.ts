import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

export const getEmployees = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { outlet_id, status } = req.query;
    const where: any = {};

    if (req.tenantId) {
      where.user = { tenantId: req.tenantId };
    }

    if (outlet_id) {
      where.outletId = parseInt(outlet_id as string);
    }

    if (status) {
      where.status = status;
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        outlet: {
          select: { id: true, name: true }
        },
        _count: {
          select: { shifts: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: employees, count: employees.length });
  } catch (error) {
    next(error);
  }
};

export const getEmployeeById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        outlet: true,
        shifts: {
          orderBy: { shiftDate: 'desc' },
          take: 30
        }
      }
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found' }
      });
    }

    res.json({ success: true, data: employee });
  } catch (error) {
    next(error);
  }
};

export const createEmployee = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, outletId, position, salary, joinDate } = req.body;

    if (!userId || !outletId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'User ID and Outlet ID are required' }
      });
    }

    const employee = await prisma.employee.create({
      data: {
        userId,
        outletId,
        position,
        salary: salary || 0,
        joinDate: joinDate ? new Date(joinDate) : new Date()
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        outlet: { select: { id: true, name: true } }
      }
    });

    res.status(201).json({ success: true, data: employee, message: 'Employee created successfully' });
  } catch (error) {
    next(error);
  }
};

export const updateEmployee = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { position, salary, status } = req.body;

    const employee = await prisma.employee.update({
      where: { id: parseInt(id) },
      data: {
        ...(position && { position }),
        ...(salary !== undefined && { salary }),
        ...(status && { status })
      }
    });

    res.json({ success: true, data: employee, message: 'Employee updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const deleteEmployee = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.employee.update({
      where: { id: parseInt(id) },
      data: { status: 'inactive' }
    });

    res.json({ success: true, message: 'Employee deactivated successfully' });
  } catch (error) {
    next(error);
  }
};

export const getEmployeeShifts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { date_from, date_to } = req.query;

    const where: any = { employeeId: parseInt(id) };

    if (date_from || date_to) {
      where.shiftDate = {};
      if (date_from) where.shiftDate.gte = new Date(date_from as string);
      if (date_to) where.shiftDate.lte = new Date(date_to as string);
    }

    const shifts = await prisma.shift.findMany({
      where,
      include: {
        employee: {
          include: {
            user: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { shiftDate: 'desc' }
    });

    res.json({ success: true, data: shifts, count: shifts.length });
  } catch (error) {
    next(error);
  }
};
