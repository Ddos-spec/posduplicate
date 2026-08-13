import { NextFunction, Request, Response } from 'express';
import { cleanOrderText, normalizeOrderItems } from '../services/ecommerce-order.p3.service';
import { reserveGuestOrderV2 } from '../services/ecommerce-reservation-v2.p3.service';

export const createPublicStorefrontOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const publicSlug = cleanOrderText(req.params.publicSlug, 120).toLowerCase();
    const customerName = cleanOrderText(req.body.customerName, 180);
    const customerPhone = cleanOrderText(req.body.customerPhone, 40);
    if (!publicSlug || !customerName || !customerPhone) {
      return res.status(400).json({ success: false, error: { code: 'ORDER_FIELDS_REQUIRED', message: 'Store, customer name and phone are required' } });
    }
    const data = await reserveGuestOrderV2({
      publicSlug,
      customerName,
      customerPhone,
      customerEmail: cleanOrderText(req.body.customerEmail, 254) || null,
      deliveryAddress: req.body.deliveryAddress && typeof req.body.deliveryAddress === 'object' && !Array.isArray(req.body.deliveryAddress) ? req.body.deliveryAddress : {},
      notes: cleanOrderText(req.body.notes, 1000) || null,
      items: normalizeOrderItems(req.body.items),
    });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};
