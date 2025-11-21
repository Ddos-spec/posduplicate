import { Request, Response } from 'express';
import prisma from '../utils/prisma';

interface AuthRequest extends Request {
  user?: any;
}

// Start a new shift
export const startShift = async (req: AuthRequest, res: Response) => {
  try {
    const { opening_cash, notes } = req.body;
    const userId = req.user.id;
    const outletId = req.user.outletId;

    // Check if there's already an open shift for this user
    const existingShift = await prisma.cashierShift.findFirst({
      where: {
        user_id: userId,
        status: 'open',
      },
    });

    if (existingShift) {
      return res.status(400).json({
        success: false,
        message: 'Anda masih memiliki shift yang aktif. Harap akhiri shift sebelumnya terlebih dahulu.',
      });
    }

    // Generate unique shift number
    const date = new Date();
    const shiftNumber = `SHIFT-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${userId}-${Date.now()}`;

    // Create new shift
    const shift = await prisma.cashierShift.create({
      data: {
        shift_number: shiftNumber,
        user_id: userId,
        outlet_id: outletId,
        started_at: new Date(),
        opening_cash: opening_cash || 0,
        expected_cash: opening_cash || 0,
        status: 'open',
        notes: notes || null,
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Shift berhasil dimulai',
      data: shift,
    });
  } catch (error: any) {
    console.error('Error starting shift:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memulai shift',
      error: error.message,
    });
  }
};

// Get current active shift
export const getCurrentShift = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;

    const shift = await prisma.cashierShift.findFirst({
      where: {
        user_id: userId,
        status: 'open',
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Tidak ada shift aktif',
        data: null,
      });
    }

    return res.json({
      success: true,
      data: shift,
    });
  } catch (error: any) {
    console.error('Error getting current shift:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data shift',
      error: error.message,
    });
  }
};

// End shift
export const endShift = async (req: AuthRequest, res: Response) => {
  try {
    const { closing_cash, actual_cash, notes } = req.body;
    const userId = req.user.id;

    // Get active shift
    const shift = await prisma.cashierShift.findFirst({
      where: {
        user_id: userId,
        status: 'open',
      },
    });

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Tidak ada shift aktif yang ditemukan',
      });
    }

    // Calculate totals from transactions since shift started
    const transactions = await prisma.transaction.findMany({
      where: {
        cashier_id: userId,
        status: 'completed',
        createdAt: {
          gte: shift.started_at
        }
      },
    });

    const totalSales = transactions.reduce((sum, t) => sum + Number(t.total || 0), 0);
    const transactionCount = transactions.length;
    const expectedCash = Number(shift.opening_cash || 0) + totalSales;
    const difference = Number(actual_cash || closing_cash || 0) - expectedCash;

    // Update shift
    const updatedShift = await prisma.cashierShift.update({
      where: { id: shift.id },
      data: {
        ended_at: new Date(),
        closing_cash: closing_cash || actual_cash,
        actual_cash: actual_cash || closing_cash,
        expected_cash: expectedCash,
        difference: difference,
        total_sales: totalSales,
        transaction_count: transactionCount,
        status: 'closed',
        notes: notes || shift.notes,
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      message: 'Shift berhasil diakhiri',
      data: updatedShift,
    });
  } catch (error: any) {
    console.error('Error ending shift:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengakhiri shift',
      error: error.message,
    });
  }
};

// Get shift report
export const getShiftReport = async (req: AuthRequest, res: Response) => {
  try {
    const { shiftId } = req.params;
    const userId = req.user.id;

    const shift = await prisma.cashierShift.findFirst({
      where: {
        id: parseInt(shiftId),
        user_id: userId,
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift tidak ditemukan',
      });
    }

    // Get transactions for this shift
    const whereConditions: any = {
      cashier_id: userId,
      status: 'completed',
      createdAt: {
        gte: shift.started_at
      }
    };

    // If shift has ended, only get transactions until end time
    if (shift.ended_at) {
      whereConditions.createdAt.lte = shift.ended_at;
    }

    const transactions = await prisma.transaction.findMany({
      where: whereConditions,
      include: {
        transaction_items: {
          include: {
            items: true,
            transaction_modifiers: true,
          },
        },
        payments: true,
      },
    });

    // Calculate detailed statistics
    const paymentMethods = transactions.reduce((acc: any, transaction) => {
      transaction.payments.forEach((payment: any) => {
        const method = payment.method;
        if (!acc[method]) {
          acc[method] = {
            count: 0,
            total: 0,
          };
        }
        acc[method].count += 1;
        acc[method].total += Number(payment.amount || 0);
      });
      return acc;
    }, {});

    // Top selling items
    const itemSales: any = {};
    transactions.forEach(transaction => {
      transaction.transaction_items.forEach((item: any) => {
        const itemId = item.item_id;
        if (!itemSales[itemId]) {
          itemSales[itemId] = {
            id: itemId,
            name: item.item_name,
            quantity: 0,
            total: 0,
          };
        }
        itemSales[itemId].quantity += Number(item.quantity || 0);
        itemSales[itemId].total += Number(item.subtotal || 0);
      });
    });

    const topItems = Object.values(itemSales)
      .sort((a: any, b: any) => b.quantity - a.quantity)
      .slice(0, 10);

    return res.json({
      success: true,
      data: {
        shift,
        statistics: {
          paymentMethods,
          topItems,
          summary: {
            total_transactions: shift.transaction_count,
            total_sales: shift.total_sales,
            opening_cash: shift.opening_cash,
            closing_cash: shift.closing_cash,
            expected_cash: shift.expected_cash,
            actual_cash: shift.actual_cash,
            difference: shift.difference,
          },
        },
      },
    });
  } catch (error: any) {
    console.error('Error getting shift report:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil laporan shift',
      error: error.message,
    });
  }
};

// Get daily report
export const getDailyReport = async (req: AuthRequest, res: Response) => {
  try {
    const { date } = req.query;
    const outletId = req.user.outletId;

    const startDate = date ? new Date(date as string) : new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);

    // Get all shifts for the day
    const shifts = await prisma.cashierShift.findMany({
      where: {
        outlet_id: outletId,
        started_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        started_at: 'asc',
      },
    });

    // Get all transactions for the day
    const transactions = await prisma.transaction.findMany({
      where: {
        status: 'completed',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        transaction_items: {
          include: {
            items: true,
          },
        },
        payments: true,
      },
    });

    // Calculate daily totals
    const totalSales = shifts.reduce((sum, shift) => sum + Number(shift.total_sales || 0), 0);
    const totalTransactions = shifts.reduce((sum, shift) => sum + Number(shift.transaction_count || 0), 0);
    const totalDifference = shifts.reduce((sum, shift) => sum + Number(shift.difference || 0), 0);

    // Payment method breakdown
    const paymentMethods: any = {};
    transactions.forEach(transaction => {
      transaction.payments.forEach((payment: any) => {
        const method = payment.method;
        if (!paymentMethods[method]) {
          paymentMethods[method] = {
            count: 0,
            total: 0,
          };
        }
        paymentMethods[method].count += 1;
        paymentMethods[method].total += Number(payment.amount || 0);
      });
    });

    res.json({
      success: true,
      data: {
        date: startDate,
        shifts,
        summary: {
          total_shifts: shifts.length,
          total_sales: totalSales,
          total_transactions: totalTransactions,
          total_difference: totalDifference,
          payment_methods: paymentMethods,
        },
      },
    });
  } catch (error: any) {
    console.error('Error getting daily report:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil laporan harian',
      error: error.message,
    });
  }
};

// Get shift history
export const getShiftHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const userId = req.user.id;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      user_id: userId,
    };

    if (status) {
      where.status = status;
    }

    const [shifts, total] = await Promise.all([
      prisma.cashierShift.findMany({
        where,
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          started_at: 'desc',
        },
        skip,
        take: Number(limit),
      }),
      prisma.cashierShift.count({ where }),
    ]);

    res.json({
      success: true,
      data: shifts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Error getting shift history:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil riwayat shift',
      error: error.message,
    });
  }
};
