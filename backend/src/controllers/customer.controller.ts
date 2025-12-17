import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

export const getCustomers = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { search, tier } = req.query;
    const tenantId = req.tenantId; // Get tenantId from middleware
    const where: any = {};

    // Get all outlets for this tenant to establish data isolation
    const tenantOutlets = await prisma.outlets.findMany({
      where: { tenant_id: tenantId },
      select: { id: true }
    });

    const outletIds = tenantOutlets.map(outlet => outlet.id);

    // If user has no outlets, return empty result
    if (outletIds.length === 0) {
      return res.json({ success: true, data: [], count: 0 });
    }

    // Filter by tenant outlets
    where.outlet_id = {
      in: outletIds
    };

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
    const tenantId = req.tenantId; // Get tenantId from middleware

    // Get all outlets for this tenant to establish data isolation
    const tenantOutlets = await prisma.outlets.findMany({
      where: { tenant_id: tenantId },
      select: { id: true }
    });

    const outletIds = tenantOutlets.map(outlet => outlet.id);

    const customer = await prisma.customers.findUnique({
      where: {
        id: parseInt(id),
        outlet_id: {
          in: outletIds
        }
      }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found or access denied' }
      });
    }

    res.json({ success: true, data: customer });
  } catch (error) {
    return _next(error);
  }
};

export const createCustomer = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { name, phone, email, address, date_of_birth, outlet_id } = req.body;
    const tenantId = req.tenantId; // Get tenantId from middleware

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Name and phone are required' }
      });
    }

    // Validate that the outlet belongs to the current tenant if outlet_id is provided
    let finalOutletId = outlet_id;
    if (outlet_id) {
      const outlet = await prisma.outlets.findUnique({
        where: { id: outlet_id }
      });

      if (!outlet || outlet.tenant_id !== tenantId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access to outlet denied'
          }
        });
      }
    } else {
      // If no outlet_id provided, try to use the tenant's default outlet
      const tenantOutlets = await prisma.outlets.findMany({
        where: { tenant_id: tenantId },
        select: { id: true }
      });

      if (tenantOutlets.length > 0) {
        finalOutletId = tenantOutlets[0].id;
      }
    }

    const customer = await prisma.customers.create({
      data: {
        name,
        phone,
        email,
        address,
        outlet_id: finalOutletId,
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
    const { name, phone, email, address, date_of_birth, outlet_id } = req.body;
    const tenantId = req.tenantId; // Get tenantId from middleware

    // Verify the customer belongs to tenant's outlet
    const customer = await prisma.customers.findUnique({
      where: { id: parseInt(id) }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' }
      });
    }

    // Check if the customer's outlet belongs to the current tenant
    if (customer.outlet_id) {
      const outlet = await prisma.outlets.findUnique({
        where: { id: customer.outlet_id }
      });

      if (!outlet || outlet.tenant_id !== tenantId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access denied'
          }
        });
      }
    }

    // If updating outletId, validate the new outlet
    if (outlet_id !== undefined) {
      const newOutlet = await prisma.outlets.findUnique({
        where: { id: outlet_id }
      });

      if (!newOutlet || newOutlet.tenant_id !== tenantId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access to outlet denied'
          }
        });
      }
    }

    const updatedCustomer = await prisma.customers.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(email && { email }),
        ...(address && { address }),
        ...(date_of_birth && { date_of_birth: new Date(date_of_birth) }),
        ...(outlet_id !== undefined && { outlet_id })
      }
    });

    res.json({ success: true, data: updatedCustomer, message: 'Customer updated successfully' });
  } catch (error) {
    return _next(error);
  }
};

export const deleteCustomer = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId; // Get tenantId from middleware

    // Verify the customer belongs to tenant's outlet
    const customer = await prisma.customers.findUnique({
      where: { id: parseInt(id) }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' }
      });
    }

    // Check if the customer's outlet belongs to the current tenant
    if (customer.outlet_id) {
      const outlet = await prisma.outlets.findUnique({
        where: { id: customer.outlet_id }
      });

      if (!outlet || outlet.tenant_id !== tenantId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access denied'
          }
        });
      }
    }

    await prisma.customers.delete({
      where: { id: parseInt(id) } // Hard delete since there's no isActive field in customers table
    });

    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    return _next(error);
  }
};

export const getCustomerTransactions = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId; // Get tenantId from middleware

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

    // Check if the customer's outlet belongs to the current tenant
    if (customer.outlet_id) {
      const outlet = await prisma.outlets.findUnique({
        where: { id: customer.outlet_id }
      });

      if (!outlet || outlet.tenant_id !== tenantId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access denied'
          }
        });
      }
    }

    // Get all outlets for this tenant to ensure proper isolation
    const tenantOutlets = await prisma.outlets.findMany({
      where: { tenant_id: tenantId },
      select: { id: true }
    });

    const outletIds = tenantOutlets.map(outlet => outlet.id);

    const transactions = await prisma.transactions.findMany({
      where: {
        outlet_id: {
          in: outletIds
        },
        OR: [
          { customer_name: customer.name },
          { customer_phone: customer.phone }
        ]
      },
      orderBy: { created_at: 'desc' }
    });

    res.json({ success: true, data: transactions, count: transactions.length });
  } catch (error) {
    return _next(error);
  }
};
