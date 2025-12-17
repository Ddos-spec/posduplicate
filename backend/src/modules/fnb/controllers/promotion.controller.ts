import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';

// Get all promotions
export const getPromotions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, applicable_to } = req.query;
    const where: any = {};

    // Filter by outlet if tenant middleware is active
    if (req.tenantId) {
      where.outlets = {
        tenant_id: req.tenantId
      };
    }

    if (status === 'active') {
      where.is_active = true;
      where.OR = [
        { end_date: null },
        { end_date: { gte: new Date() } }
      ];
    } else if (status === 'inactive') {
      where.is_active = false;
    } else if (status === 'expired') {
      where.end_date = { lt: new Date() };
    }

    if (applicable_to) {
      where.applicable_to = applicable_to;
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
      orderBy: { created_at: 'desc' }
    });

    res.json({ success: true, data: promotions });
  } catch (error) {
    return next(error);
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
        discount_usage: {
          include: {
            transactions: {
              select: {
                id: true,
                transaction_number: true,
                total: true,
                created_at: true
              }
            }
          },
          take: 50,
          orderBy: { created_at: 'desc' }
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
    return next(error);
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
        outlet_id: outletId || null,
        name,
        description,
        discount_type: discountType,
        discount_value: discountValue,
        min_purchase: minPurchase || 0,
        max_discount: maxDiscount || null,
        applicable_to: applicableTo || 'all',
        applicable_ids: applicableIds || null,
        start_date: startDate ? new Date(startDate) : null,
        end_date: endDate ? new Date(endDate) : null,
        usage_limit: usageLimit || null,
        usage_count: 0,
        is_active: true
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
    return next(error);
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
    if (discountType !== undefined) data.discount_type = discountType;
    if (discountValue !== undefined) data.discount_value = discountValue;
    if (minPurchase !== undefined) data.min_purchase = minPurchase;
    if (maxDiscount !== undefined) data.max_discount = maxDiscount;
    if (applicableTo !== undefined) data.applicable_to = applicableTo;
    if (applicableIds !== undefined) data.applicable_ids = applicableIds;
    if (startDate !== undefined) data.start_date = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) data.end_date = endDate ? new Date(endDate) : null;
    if (usageLimit !== undefined) data.usage_limit = usageLimit;
    if (isActive !== undefined) data.is_active = isActive;

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
    return next(error);
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
    return next(error);
  }
};

// Get applicable promotions for a transaction
export const getApplicablePromotions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subtotal, items, categoryIds } = req.body;

    const now = new Date();

    const promotions = await prisma.promotions.findMany({
      where: {
        is_active: true,
        OR: [
          { start_date: null },
          { start_date: { lte: now } }
        ],
        AND: [
          {
            OR: [
              { end_date: null },
              { end_date: { gte: now } }
            ]
          },
          {
            OR: [
              { usage_limit: null },
              { usage_count: { lt: prisma.promotions.fields.usage_limit } }
            ]
          },
          {
            min_purchase: { lte: subtotal }
          }
        ]
      },
      orderBy: { discount_value: 'desc' }
    });

    // Filter by applicable items/categories
    const applicablePromotions = promotions.filter(promo => {
      if (promo.applicable_to === 'all') return true;

      if (promo.applicable_to === 'category' && promo.applicable_ids) {
        const promoCategories = promo.applicable_ids as any;
        return categoryIds?.some((catId: number) => promoCategories.includes(catId));
      }

      if (promo.applicable_to === 'item' && promo.applicable_ids) {
        const promoItems = promo.applicable_ids as any;
        return items?.some((itemId: number) => promoItems.includes(itemId));
      }

      return false;
    });

    // Calculate discount for each promotion
    const promotionsWithDiscount = applicablePromotions.map(promo => {
      let discountAmount = 0;

      if (promo.discount_type === 'percentage') {
        discountAmount = (subtotal * Number(promo.discount_value)) / 100;
        if (promo.max_discount && discountAmount > Number(promo.max_discount)) {
          discountAmount = Number(promo.max_discount);
        }
      } else {
        discountAmount = Number(promo.discount_value);
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
    return next(error);
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
    const usage = await prisma.discount_usage.create({
      data: {
        promotion_id: promotionId,
        transaction_id: transactionId,
        discount_amount: discountAmount
      }
    });

    // Increment usage count
    await prisma.promotions.update({
      where: { id: promotionId },
      data: {
        usage_count: { increment: 1 }
      }
    });

    res.json({
      success: true,
      data: usage,
      message: 'Promotion applied successfully'
    });
  } catch (error) {
    return next(error);
  }
};
