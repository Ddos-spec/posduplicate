import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

export const getCustomers = async (req: Request, res: Response, next: NextFunction) => {
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
      where.tierId = parseInt(tier as string);
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        tier: true,
        _count: {
          select: { transactions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: customers, count: customers.length });
  } catch (error) {
    next(error);
  }
};

export const getCustomerById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(id) },
      include: {
        tier: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        loyaltyPoints: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' }
      });
    }

    res.json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

export const createCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, phone, email, address, birthday, tierId } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Name and phone are required' }
      });
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        phone,
        email,
        address,
        birthday: birthday ? new Date(birthday) : null,
        tierId: tierId || null
      }
    });

    res.status(201).json({ success: true, data: customer, message: 'Customer created successfully' });
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, phone, email, address, birthday, tierId } = req.body;

    const customer = await prisma.customer.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(email && { email }),
        ...(address && { address }),
        ...(birthday && { birthday: new Date(birthday) }),
        ...(tierId !== undefined && { tierId })
      }
    });

    res.json({ success: true, data: customer, message: 'Customer updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const deleteCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.customer.update({
      where: { id: parseInt(id) },
      data: { isActive: false }
    });

    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getCustomerTransactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const transactions = await prisma.loyaltyTransaction.findMany({
      where: { customerId: parseInt(id) },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: transactions, count: transactions.length });
  } catch (error) {
    next(error);
  }
};
