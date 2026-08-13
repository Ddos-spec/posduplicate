import crypto from 'crypto';

export type RequestedOrderItem = { itemId: number; quantity: number };

export const cleanOrderText = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);
export const hashOrderToken = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
export const newOrderToken = () => crypto.randomBytes(32).toString('base64url');
export const newOrderNumber = () => `WEB-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

export const normalizeCheckoutToken = (value: unknown) => {
  const token = String(value ?? '').trim();
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) throw Object.assign(new Error('Invalid checkout token'), { status: 400, code: 'INVALID_CHECKOUT_TOKEN' });
  return token;
};

export const normalizeOrderItems = (value: unknown): RequestedOrderItem[] => {
  if (!Array.isArray(value) || value.length === 0 || value.length > 50) throw Object.assign(new Error('Order must contain 1-50 items'), { status: 400, code: 'INVALID_ORDER_ITEMS' });
  const merged = new Map<number, number>();
  for (const row of value) {
    const itemId = Number((row as any)?.itemId);
    const quantity = Number((row as any)?.quantity);
    if (!Number.isInteger(itemId) || itemId <= 0) throw Object.assign(new Error('Invalid item id'), { status: 400, code: 'INVALID_ITEM_ID' });
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1000) throw Object.assign(new Error('Invalid quantity'), { status: 400, code: 'INVALID_QUANTITY' });
    const mergedQuantity = Math.round(((merged.get(itemId) || 0) + quantity) * 1000) / 1000;
    if (mergedQuantity > 1000) throw Object.assign(new Error('Merged item quantity exceeds limit'), { status: 400, code: 'INVALID_QUANTITY' });
    merged.set(itemId, mergedQuantity);
  }
  return [...merged.entries()].map(([itemId, quantity]) => ({ itemId, quantity }));
};
