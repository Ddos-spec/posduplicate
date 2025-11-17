import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

export const getCustomers = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { search, tier } = req.query;
    const where: any = { isActive: true };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string } },
        { email: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (tier) {
      // Tier functionality removed as customers table doesn't have tierId field
    }

    const customers = await prisma.customers.findMany({
      where,
      orderBy: { id: 'desc' }
    });

    res.json({ success: true, data: customers, count: customers.length });
  } catch (error) {
    return _next(error);
  }
};

export const getCustomerById = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customers.findUnique({
      where: { id: parseInt(id) }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' }
      });
    }

    res.json({ success: true, data: customer });
  } catch (error) {
    return _next(error);
  }
};

export const createCustomer = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { name, phone, email, address, date_of_birth } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Name and phone are required' }
      });
    }

    const customer = await prisma.customers.create({
      data: {
        name,
        phone,
        email,
        address,
        date_of_birth: date_of_birth ? new Date(date_of_birth) : null
      }
    });

    res.status(201).json({ success: true, data: customer, message: 'Customer created successfully' });
  } catch (error) {
    return _next(error);
  }
};

export const updateCustomer = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, phone, email, address, date_of_birth } = req.body;

    const customer = await prisma.customers.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(email && { email }),
        ...(address && { address }),
        ...(date_of_birth && { date_of_birth: new Date(date_of_birth) })
      }
    });

    res.json({ success: true, data: customer, message: 'Customer updated successfully' });
  } catch (error) {
    return _next(error);
  }
};

export const deleteCustomer = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.customers.delete({
      where: { id: parseInt(id) }
    });

    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    return _next(error);
  }
};

export const getCustomerTransactions = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;

    // Get customer first to match by name/phone since there's no direct relation
    const customer = await prisma.customers.findUnique({
      where: { id: parseInt(id) }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' }
      });
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { customer_name: customer.name },
          { customer_phone: customer.phone }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: transactions, count: transactions.length });
  } catch (error) {
    return _next(error);
  }
};
