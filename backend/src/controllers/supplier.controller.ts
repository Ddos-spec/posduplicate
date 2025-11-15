/**
 * IMPORTANT: The 'supplier' model does not exist in the Prisma schema.
 * This file has been commented out until the supplier model is added to the schema.
 *
 * To fix this:
 * 1. Add the supplier model to prisma/schema.prisma
 * 2. Run `npx prisma generate` to generate the Prisma client
 * 3. Uncomment the code below
 */

/*
export const getSuppliers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { outlet_id } = req.query;
    const where: any = { isActive: true };

    if (req.tenantId) {
      where.outlet = { tenantId: req.tenantId };
    }
    if (outlet_id) where.outletId = parseInt(outlet_id as string);

    const suppliers = await prisma.supplier.findMany({
      where,
      include: {
        outlet: { select: { id: true, name: true } },
        _count: { select: { purchaseOrders: true } }
      },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: suppliers, count: suppliers.length });
  } catch (error) {
    next(error);
  }
};

export const createSupplier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, contact, phone, email, address, outletId } = req.body;
    if (!name) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Supplier name is required' }
      });
    }
    const supplier = await prisma.supplier.create({
      data: { name, contact, phone, email, address, outletId }
    });
    res.status(201).json({ success: true, data: supplier, message: 'Supplier created successfully' });
  } catch (error) {
    next(error);
  }
};

export const updateSupplier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, contact, phone, email, address, isActive } = req.body;
    const supplier = await prisma.supplier.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(contact && { contact }),
        ...(phone && { phone }),
        ...(email && { email }),
        ...(address && { address }),
        ...(isActive !== undefined && { isActive })
      }
    });
    res.json({ success: true, data: supplier, message: 'Supplier updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const deleteSupplier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.supplier.update({
      where: { id: parseInt(id) },
      data: { isActive: false }
    });
    res.json({ success: true, message: 'Supplier deleted successfully' });
  } catch (error) {
    next(error);
  }
};
*/
