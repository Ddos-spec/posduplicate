import { create } from 'zustand';

interface CartItem {
  id: string;
  itemId: number;
  name: string;
  price: number;
  priceGofood?: number | null;
  priceGrabfood?: number | null;
  priceShopeefood?: number | null;
  quantity: number;
  variantId?: number;
  variantName?: string;
  modifiers?: { id: number; name: string; price: number }[];
  notes?: string;
}

interface CartState {
  items: CartItem[];
  orderType: string;
  tableId: number | null;
  customerName: string;
  customerPhone: string;
  addItem: (item: Omit<CartItem, 'id' | 'quantity'>) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  setOrderType: (type: string) => void;
  setTable: (tableId: number | null) => void;
  setCustomer: (name: string, phone: string) => void;
  getTotal: (paymentMethod?: string) => number;
  getSubtotal: (paymentMethod?: string) => number;
  getItemPrice: (item: CartItem, paymentMethod?: string) => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  orderType: 'dine_in',
  tableId: null,
  customerName: '',
  customerPhone: '',

  addItem: (item) => {
    const id = `${item.itemId}-${item.variantId || 0}-${JSON.stringify(item.modifiers || [])}`;
    const existing = get().items.find((i) => i.id === id);

    if (existing) {
      set({
        items: get().items.map((i) =>
          i.id === id ? { ...i, quantity: i.quantity + 1 } : i
        ),
      });
    } else {
      set({ items: [...get().items, { ...item, id, quantity: 1 }] });
    }
  },

  updateQuantity: (id, quantity) => {
    if (quantity <= 0) {
      set({ items: get().items.filter((i) => i.id !== id) });
    } else {
      set({
        items: get().items.map((i) => (i.id === id ? { ...i, quantity } : i)),
      });
    }
  },

  removeItem: (id) => {
    set({ items: get().items.filter((i) => i.id !== id) });
  },

  clearCart: () => {
    set({
      items: [],
      orderType: 'dine_in',
      tableId: null,
      customerName: '',
      customerPhone: '',
    });
  },

  setOrderType: (type) => set({ orderType: type }),
  setTable: (tableId) => set({ tableId }),
  setCustomer: (name, phone) => set({ customerName: name, customerPhone: phone }),

  getItemPrice: (item, paymentMethod) => {
    // Get platform-specific price or fallback to default price
    if (paymentMethod === 'gofood' && item.priceGofood) {
      return item.priceGofood;
    }
    if (paymentMethod === 'grabfood' && item.priceGrabfood) {
      return item.priceGrabfood;
    }
    if (paymentMethod === 'shopeefood' && item.priceShopeefood) {
      return item.priceShopeefood;
    }
    return item.price; // Default/cash price
  },

  getSubtotal: (paymentMethod) => {
    return get().items.reduce((sum, item) => {
      const itemPrice = get().getItemPrice(item, paymentMethod);
      const modifiersTotal = (item.modifiers || []).reduce((s, m) => s + m.price, 0);
      return sum + (itemPrice + modifiersTotal) * item.quantity;
    }, 0);
  },

  getTotal: (paymentMethod) => {
    return get().getSubtotal(paymentMethod);
  },
}));
