import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all promotions
export const getPromotions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, applicable_to } = req.query;
    const where: any = {};

    // Filter by outlet if tenant middleware is active
    if (req.tenantId) {
      where.outlets = {
        tenantId: req.tenantId
      };
    }

    if (status === 'active') {
      where.isActive = true;
      where.OR = [
        { endDate: null },
        { endDate: { gte: new Date() } }
      ];
    } else if (status === 'inactive') {
      where.isActive = false;
    } else if (status === 'expired') {
      where.endDate = { lt: new Date() };
    }

    if (applicable_to) {
      where.applicableTo = applicable_to;
    }

    const promotions = await prisma.promotions.findMany({
      where,
      include: {
        outlets: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: promotions });
  } catch (error) {
    next(error);
  }
};

// Get promotion by ID
export const getPromotionById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const promotion = await prisma.promotions.findUnique({
      where: { id: parseInt(id) },
      include: {
        outlets: {
          select: {
            id: true,
            name: true
          }
        },
        discountUsage: {
          include: {
            transactions: {
              select: {
                id: true,
                transactionNumber: true,
                total: true,
                createdAt: true
              }
            }
          },
          take: 50,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!promotion) {
      return res.status(404).json({
        success: false,
        error: { code: 'PROMOTION_NOT_FOUND', message: 'Promotion not found' }
      });
    }

    res.json({ success: true, data: promotion });
  } catch (error) {
    next(error);
  }
};

// Create new promotion
export const createPromotion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      outletId,
      name,
      description,
      discountType,
      discountValue,
      minPurchase,
      maxDiscount,
      applicableTo,
      applicableIds,
      startDate,
      endDate,
      usageLimit
    } = req.body;

    if (!name || !discountType || !discountValue) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Name, discount type and value are required' }
      });
    }

    if (!['percentage', 'fixed_amount'].includes(discountType)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_DISCOUNT_TYPE', message: 'Discount type must be percentage or fixed_amount' }
      });
    }

    const promotion = await prisma.promotions.create({
      data: {
        outletId: outletId || null,
        name,
        description,
        discountType,
        discountValue,
        minPurchase: minPurchase || 0,
        maxDiscount: maxDiscount || null,
        applicableTo: applicableTo || 'all',
        applicableIds: applicableIds || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        usageLimit: usageLimit || null,
        usageCount: 0,
        isActive: true
      },
      include: {
        outlets: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: promotion,
      message: 'Promotion created successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Update promotion
export const updatePromotion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      discountType,
      discountValue,
      minPurchase,
      maxDiscount,
      applicableTo,
      applicableIds,
      startDate,
      endDate,
      usageLimit,
      isActive
    } = req.body;

    const data: any = {};

    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (discountType !== undefined) data.discountType = discountType;
    if (discountValue !== undefined) data.discountValue = discountValue;
    if (minPurchase !== undefined) data.minPurchase = minPurchase;
    if (maxDiscount !== undefined) data.maxDiscount = maxDiscount;
    if (applicableTo !== undefined) data.applicableTo = applicableTo;
    if (applicableIds !== undefined) data.applicableIds = applicableIds;
    if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null;
    if (usageLimit !== undefined) data.usageLimit = usageLimit;
    if (isActive !== undefined) data.isActive = isActive;

    const promotion = await prisma.promotions.update({
      where: { id: parseInt(id) },
      data,
      include: {
        outlets: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: promotion,
      message: 'Promotion updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Delete promotion
export const deletePromotion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.promotions.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Promotion deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get applicable promotions for a transaction
export const getApplicablePromotions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subtotal, items, categoryIds } = req.body;

    const now = new Date();

    const promotions = await prisma.promotions.findMany({
      where: {
        isActive: true,
        OR: [
          { startDate: null },
          { startDate: { lte: now } }
        ],
        AND: [
          {
            OR: [
              { endDate: null },
              { endDate: { gte: now } }
            ]
          },
          {
            OR: [
              { usageLimit: null },
              { usageCount: { lt: prisma.promotions.fields.usageLimit } }
            ]
          },
          {
            minPurchase: { lte: subtotal }
          }
        ]
      },
      orderBy: { discountValue: 'desc' }
    });

    // Filter by applicable items/categories
    const applicablePromotions = promotions.filter(promo => {
      if (promo.applicableTo === 'all') return true;

      if (promo.applicableTo === 'category' && promo.applicableIds) {
        const promoCategories = promo.applicableIds as any;
        return categoryIds?.some((catId: number) => promoCategories.includes(catId));
      }

      if (promo.applicableTo === 'item' && promo.applicableIds) {
        const promoItems = promo.applicableIds as any;
        return items?.some((itemId: number) => promoItems.includes(itemId));
      }

      return false;
    });

    // Calculate discount for each promotion
    const promotionsWithDiscount = applicablePromotions.map(promo => {
      let discountAmount = 0;

      if (promo.discountType === 'percentage') {
        discountAmount = (subtotal * promo.discountValue) / 100;
        if (promo.maxDiscount && discountAmount > promo.maxDiscount) {
          discountAmount = promo.maxDiscount;
        }
      } else {
        discountAmount = promo.discountValue;
      }

      return {
        ...promo,
        calculatedDiscount: discountAmount
      };
    });

    res.json({
      success: true,
      data: promotionsWithDiscount
    });
  } catch (error) {
    next(error);
  }
};

// Apply promotion to transaction
export const applyPromotion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { promotionId, transactionId, discountAmount } = req.body;

    if (!promotionId || !transactionId || !discountAmount) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Promotion ID, transaction ID and discount amount are required' }
      });
    }

    // Record discount usage
    const usage = await prisma.discountUsage.create({
      data: {
        promotionId,
        transactionId,
        discountAmount
      }
    });

    // Increment usage count
    await prisma.promotions.update({
      where: { id: promotionId },
      data: {
        usageCount: { increment: 1 }
      }
    });

    res.json({
      success: true,
      data: usage,
      message: 'Promotion applied successfully'
    });
  } catch (error) {
    next(error);
  }
};
