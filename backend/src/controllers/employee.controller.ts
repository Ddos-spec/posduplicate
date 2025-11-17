import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

export const getEmployees = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { outlet_id, is_active } = req.query;
    const where: any = {};

    if (req.tenantId) {
      where.user = { tenantId: req.tenantId };
    }

    if (outlet_id) {
      where.outlet_id = parseInt(outlet_id as string);
    }

    if (is_active !== undefined) {
      where.is_active = is_active === 'true';
    }

    const employees = await prisma.employees.findMany({
      where,
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            roles: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        outlets: {
          select: { id: true, name: true }
        }
      },
      orderBy: { id: 'desc' }
    });

    res.json({ success: true, data: employees, count: employees.length });
  } catch (error) {
    _next(error);
  }
};

export const getEmployeeById = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;

    const employee = await prisma.employees.findUnique({
      where: { id: parseInt(id) },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            roles: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        outlets: true
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
    return _next(error);
  }
};

export const createEmployee = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { userId, outletId, employeeCode, pinCode, position, salary, hiredAt } = req.body;

    if (!userId || !outletId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'User ID and Outlet ID are required' }
      });
    }

    // Check if user already has an employee record for this outlet
    const existing = await prisma.employees.findFirst({
      where: {
        user_id: userId,
        outlet_id: outletId
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: { code: 'EMPLOYEE_EXISTS', message: 'Employee already exists for this user and outlet' }
      });
    }

    const employee = await prisma.employees.create({
      data: {
        user_id: userId,
        outlet_id: outletId,
        employee_code: employeeCode,
        pin_code: pinCode,
        position,
        salary: salary || 0,
        hired_at: hiredAt ? new Date(hiredAt) : new Date(),
        is_active: true
      },
      include: {
        users: { select: { id: true, name: true, email: true } },
        outlets: { select: { id: true, name: true } }
      }
    });

    res.status(201).json({ success: true, data: employee, message: 'Employee created successfully' });
  } catch (error) {
    return _next(error);
  }
};

export const updateEmployee = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;
    const { employeeCode, pinCode, position, salary, isActive } = req.body;

    const data: any = {};
    if (employeeCode !== undefined) data.employee_code = employeeCode;
    if (pinCode !== undefined) data.pin_code = pinCode;
    if (position !== undefined) data.position = position;
    if (salary !== undefined) data.salary = salary;
    if (isActive !== undefined) data.is_active = isActive;

    const employee = await prisma.employees.update({
      where: { id: parseInt(id) },
      data,
      include: {
        users: { select: { id: true, name: true, email: true } },
        outlets: { select: { id: true, name: true } }
      }
    });

    res.json({ success: true, data: employee, message: 'Employee updated successfully' });
  } catch (error) {
    _next(error);
  }
};

export const deleteEmployee = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.employees.update({
      where: { id: parseInt(id) },
      data: { is_active: false }
    });

    res.json({ success: true, message: 'Employee deactivated successfully' });
  } catch (error) {
    _next(error);
  }
};

export const getEmployeeShifts = async (_req: Request, res: Response, _next: NextFunction) => {
  try {
    // Note: The 'shifts' model doesn't exist in the current schema
    // This would need to be added to the Prisma schema to properly implement
    // For now, return an empty array as a placeholder
    const shifts: any[] = [];

    res.json({ success: true, data: shifts, count: shifts.length });
  } catch (error) {
    _next(error);
  }
};
