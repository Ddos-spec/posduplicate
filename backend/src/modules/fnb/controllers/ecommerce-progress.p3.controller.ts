import { NextFunction, Request, Response } from 'express';
import { transitionOrder } from '../services/ecommerce-transition.p3.service';

export const progressEcommerceOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await transitionOrder(Number(req.tenantId), Number(req.userId), Number(req.params.id), String(req.body.status || '').trim());
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};
