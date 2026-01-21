import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';

// Get all purchase orders
export const getAllPurchaseOrders = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { outlet_id, status, supplier_id } = req.query;
    const where: any = {};

    if (outlet_id) {
      where.outlet_id = parseInt(outlet_id as string);
    }

    if (status) {
      where.status = status;
    }

    if (supplier_id) {
      where.supplier_id = parseInt(supplier_id as string);
    }

    const orders = await prisma.purchase_orders.findMany({
      where,
      include: {
        suppliers: { select: { id: true, name: true } },
        created_by_user: { select: { id: true, name: true } },
        approved_by_user: { select: { id: true, name: true } },
        purchase_order_items: {
          include: {
            inventory: { select: { id: true, name: true, sku: true, unit: true } }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    res.json({
      success: true,
      data: orders,
      count: orders.length
    });
  } catch (error) {
    return _next(error);
  }
};

// Get single purchase order
export const getPurchaseOrderById = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;

    const order = await prisma.purchase_orders.findUnique({
      where: { id: parseInt(id) },
      include: {
        suppliers: { select: { id: true, name: true, contact_person: true, phone: true } },
        created_by_user: { select: { id: true, name: true } },
        approved_by_user: { select: { id: true, name: true } },
        purchase_order_items: {
          include: {
            inventory: { select: { id: true, name: true, sku: true, unit: true, current_stock: true } }
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'PO tidak ditemukan' }
      });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    return _next(error);
  }
};

// Generate PO number
const generatePONumber = async (outletId: number): Promise<string> => {
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const prefix = `PO${year}${month}`;

  const lastPO = await prisma.purchase_orders.findFirst({
    where: { po_number: { startsWith: prefix } },
    orderBy: { po_number: 'desc' }
  });

  let sequence = 1;
  if (lastPO) {
    const lastSeq = parseInt(lastPO.po_number.slice(-4));
    sequence = lastSeq + 1;
  }

  return `${prefix}-${outletId.toString().padStart(3, '0')}-${sequence.toString().padStart(4, '0')}`;
};

// Create purchase order
export const createPurchaseOrder = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const {
      outletId,
      supplierId,
      expectedDate,
      notes,
      items // Array of { inventoryId, quantity, unit, unitPrice }
    } = req.body;
    const userId = req.userId;

    if (!outletId || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Outlet dan items wajib diisi' }
      });
    }

    const poNumber = await generatePONumber(outletId);

    // Calculate totals
    let subtotal = 0;
    const poItems = items.map((item: any) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      subtotal += itemSubtotal;
      return {
        inventory_id: item.inventoryId,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unitPrice,
        subtotal: itemSubtotal
      };
    });

    const order = await prisma.purchase_orders.create({
      data: {
        outlet_id: outletId,
        po_number: poNumber,
        supplier_id: supplierId || null,
        status: 'draft',
        expected_date: expectedDate ? new Date(expectedDate) : null,
        subtotal,
        total: subtotal,
        notes,
        created_by: userId!,
        purchase_order_items: {
          create: poItems
        }
      },
      include: {
        suppliers: { select: { id: true, name: true } },
        purchase_order_items: {
          include: {
            inventory: { select: { id: true, name: true, sku: true } }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'PO berhasil dibuat',
      data: order
    });
  } catch (error) {
    return _next(error);
  }
};

// Update purchase order
export const updatePurchaseOrder = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;
    const { supplierId, expectedDate, notes, items } = req.body;

    const existingPO = await prisma.purchase_orders.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingPO) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'PO tidak ditemukan' }
      });
    }

    if (!['draft', 'pending'].includes(existingPO.status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Hanya PO dengan status draft/pending yang bisa diedit' }
      });
    }

    // Calculate new totals if items provided
    let subtotal = existingPO.subtotal;
    if (items && items.length > 0) {
      subtotal = 0 as unknown as typeof existingPO.subtotal;

      // Delete old items
      await prisma.purchase_order_items.deleteMany({
        where: { po_id: parseInt(id) }
      });

      // Create new items
      const poItems = items.map((item: any) => {
        const itemSubtotal = item.quantity * item.unitPrice;
        (subtotal as any) += itemSubtotal;
        return {
          po_id: parseInt(id),
          inventory_id: item.inventoryId,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unitPrice,
          subtotal: itemSubtotal
        };
      });

      await prisma.purchase_order_items.createMany({ data: poItems });
    }

    const order = await prisma.purchase_orders.update({
      where: { id: parseInt(id) },
      data: {
        ...(supplierId !== undefined && { supplier_id: supplierId }),
        ...(expectedDate !== undefined && { expected_date: expectedDate ? new Date(expectedDate) : null }),
        ...(notes !== undefined && { notes }),
        subtotal,
        total: subtotal
      },
      include: {
        suppliers: { select: { id: true, name: true } },
        purchase_order_items: {
          include: {
            inventory: { select: { id: true, name: true, sku: true } }
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'PO berhasil diupdate',
      data: order
    });
  } catch (error) {
    return _next(error);
  }
};

// Update PO status
export const updatePOStatus = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.userId;

    const validStatuses = ['draft', 'pending', 'approved', 'ordered', 'partial', 'received', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Status tidak valid' }
      });
    }

    const existingPO = await prisma.purchase_orders.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingPO) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'PO tidak ditemukan' }
      });
    }

    const updateData: any = { status };

    // Set approval data
    if (status === 'approved') {
      updateData.approved_by = userId;
      updateData.approved_at = new Date();
    }

    // Set received date
    if (status === 'received') {
      updateData.received_date = new Date();
    }

    const order = await prisma.purchase_orders.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    res.json({
      success: true,
      message: `Status PO diubah ke ${status}`,
      data: order
    });
  } catch (error) {
    return _next(error);
  }
};

// Receive PO items (update received quantity)
export const receivePOItems = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;
    const { items } = req.body; // Array of { itemId, receivedQty }

    const existingPO = await prisma.purchase_orders.findUnique({
      where: { id: parseInt(id) },
      include: { purchase_order_items: true }
    });

    if (!existingPO) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'PO tidak ditemukan' }
      });
    }

    if (!['approved', 'ordered', 'partial'].includes(existingPO.status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'PO harus dalam status approved/ordered/partial' }
      });
    }

    // Update received quantities and inventory stock
    for (const item of items) {
      const poItem = existingPO.purchase_order_items.find(i => i.id === item.itemId);
      if (!poItem) continue;

      // Update PO item received qty
      await prisma.purchase_order_items.update({
        where: { id: item.itemId },
        data: { received_qty: item.receivedQty }
      });

      // Update inventory stock
      const additionalQty = item.receivedQty - parseFloat(poItem.received_qty.toString());
      if (additionalQty > 0) {
        await prisma.inventory.update({
          where: { id: poItem.inventory_id },
          data: {
            current_stock: { increment: additionalQty },
            last_restock_date: new Date()
          }
        });
      }
    }

    // Check if all items fully received
    const updatedPO = await prisma.purchase_orders.findUnique({
      where: { id: parseInt(id) },
      include: { purchase_order_items: true }
    });

    const allReceived = updatedPO!.purchase_order_items.every(
      item => parseFloat(item.received_qty.toString()) >= parseFloat(item.quantity.toString())
    );

    const someReceived = updatedPO!.purchase_order_items.some(
      item => parseFloat(item.received_qty.toString()) > 0
    );

    let newStatus = existingPO.status;
    if (allReceived) {
      newStatus = 'received';
    } else if (someReceived) {
      newStatus = 'partial';
    }

    if (newStatus !== existingPO.status) {
      await prisma.purchase_orders.update({
        where: { id: parseInt(id) },
        data: {
          status: newStatus,
          ...(newStatus === 'received' && { received_date: new Date() })
        }
      });
    }

    res.json({
      success: true,
      message: 'Penerimaan barang berhasil dicatat',
      data: { status: newStatus }
    });
  } catch (error) {
    return _next(error);
  }
};

// Delete purchase order
export const deletePurchaseOrder = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;

    const existingPO = await prisma.purchase_orders.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingPO) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'PO tidak ditemukan' }
      });
    }

    if (!['draft', 'cancelled'].includes(existingPO.status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Hanya PO dengan status draft/cancelled yang bisa dihapus' }
      });
    }

    // Delete items first (cascade should handle this, but explicit is safer)
    await prisma.purchase_order_items.deleteMany({
      where: { po_id: parseInt(id) }
    });

    await prisma.purchase_orders.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'PO berhasil dihapus'
    });
  } catch (error) {
    return _next(error);
  }
};

// Get PO suggestions based on low stock
export const getPOSuggestions = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { outlet_id } = req.query;
    const where: any = { is_active: true };

    if (outlet_id) {
      where.outlet_id = parseInt(outlet_id as string);
    }

    const items = await prisma.inventory.findMany({
      where,
      include: {
        suppliers: { select: { id: true, name: true } }
      }
    });

    const suggestions = items
      .filter(item => {
        const currentStock = parseFloat(item.current_stock.toString());
        const minStock = parseFloat(item.min_stock.toString());
        return currentStock <= minStock;
      })
      .map(item => {
        const currentStock = parseFloat(item.current_stock.toString());
        const minStock = parseFloat(item.min_stock.toString());
        const avgDaily = item.avg_daily_usage ? parseFloat(item.avg_daily_usage.toString()) : 0;

        // Suggest reorder quantity: min_stock + 5 days buffer - current_stock
        const suggestedQty = Math.max(minStock + (avgDaily * 5) - currentStock, minStock);

        return {
          inventoryId: item.id,
          name: item.name,
          sku: item.sku,
          currentStock,
          minStock,
          suggestedQty: Math.ceil(suggestedQty),
          unit: item.unit,
          supplier: item.suppliers,
          costPerUnit: parseFloat(item.cost_amount.toString())
        };
      });

    res.json({
      success: true,
      data: suggestions,
      count: suggestions.length
    });
  } catch (error) {
    return _next(error);
  }
};
