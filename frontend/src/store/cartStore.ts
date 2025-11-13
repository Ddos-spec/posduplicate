import { create } from 'zustand';

interface CartItem {
  id: string;
  itemId: number;
  name: string;
  price: number;
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
  getTotal: () => number;
  getSubtotal: () => number;
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

  getSubtotal: () => {
    return get().items.reduce((sum, item) => {
      const modifiersTotal = (item.modifiers || []).reduce((s, m) => s + m.price, 0);
      return sum + (item.price + modifiersTotal) * item.quantity;
    }, 0);
  },

  getTotal: () => {
    return get().getSubtotal();
  },
}));
