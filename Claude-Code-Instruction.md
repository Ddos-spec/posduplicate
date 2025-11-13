# CLAUDE CODE - MOKA POS FRONTEND DEVELOPMENT INSTRUCTION

## 🎯 PROJECT BRIEF

Refactor file HTML prototipe kasir menjadi aplikasi React production-ready. File HTML adalah UI/UX reference utama. Semua fitur kasir harus identical dengan HTML prototype, dipindahkan ke React dengan component modular + state management.

**Output**: React app fully functional, dapat replace mock API ke real backend tanpa refactor besar-besaran.

---

## 📋 PHASE 1: SETUP & ARCHITECTURE

### 1.1 Project Initialization
```bash
npm create vite@latest moka-pos -- --template react
cd moka-pos
npm install
```

### 1.2 Folder Structure
```
src/
├── components/
│   ├── Layout/
│   │   ├── TopBar.jsx
│   │   └── QuickSidebar.jsx
│   ├── POS/
│   │   ├── ProductGrid.jsx
│   │   ├── ProductCard.jsx
│   │   ├── CartPanel.jsx
│   │   ├── CartItem.jsx
│   │   └── CartSummary.jsx
│   ├── Modals/
│   │   ├── ProductDetailModal.jsx
│   │   ├── TableSelectionModal.jsx
│   │   └── PaymentModal.jsx
│   ├── Common/
│   │   ├── Button.jsx
│   │   ├── Modal.jsx
│   │   └── NotificationToast.jsx
│   └── Pages/
│       ├── POSPage.jsx
│       ├── InventoryPage.jsx
│       ├── ShiftPage.jsx
│       └── SettingsPage.jsx
├── context/
│   ├── CartContext.jsx
│   ├── OrderContext.jsx
│   ├── UIContext.jsx
│   └── AppProvider.jsx
├── services/
│   ├── api.js (mock dulu)
│   ├── productService.js
│   ├── orderService.js
│   └── tableService.js
├── hooks/
│   ├── useCart.js
│   ├── useOrder.js
│   └── useModal.js
├── styles/
│   ├── index.css (global + CSS variables)
│   └── colors.css
├── mockData/
│   ├── products.json
│   ├── tables.json
│   └── mockAPI.js
├── App.jsx
└── main.jsx
```

### 1.3 Install Dependencies
```bash
npm install react-router-dom axios zustand
```
(Optional: Redux/Zustand untuk state management, sesuaikan preferensi)

---

## 📱 PHASE 2: COMPONENT STRUCTURE

### 2.1 Layout Components
- **TopBar.jsx**: Logo, store info, shift status, real-time clock
- **QuickSidebar.jsx**: 4 quick buttons (POS, Inventory, Shift, Settings)

### 2.2 POS Main Components
- **ProductGrid.jsx**: Grid 4-5 column (responsive), fetch dari mock data
- **ProductCard.jsx**: Reusable card component, trigger modal on click
- **CartPanel.jsx**: Cart header (order type + table), items list, summary, action buttons
- **CartItem.jsx**: Per-item cart display + qty control + remove button
- **CartSummary.jsx**: Subtotal, tax, total calculation

### 2.3 Modal Components
- **ProductDetailModal.jsx**: 
  - Product image/name/price
  - Variant selector (radio)
  - Modifier selector (checkbox)
  - Quantity control
  - Special notes textarea
  - Add to cart button

- **TableSelectionModal.jsx**:
  - Grid table cards (3 column)
  - Select + confirm

- **PaymentModal.jsx**:
  - Payment summary (subtotal, tax, total)
  - 4 payment method buttons (cash, QRIS, transfer, card)
  - Cash input + auto change calculation
  - Confirm/cancel buttons

### 2.4 Common Components
- **Button.jsx**: Primary, secondary, success, danger variants
- **Modal.jsx**: Generic modal wrapper (header, content, footer, close)
- **NotificationToast.jsx**: Success/error notifications

---

## 🗂️ PHASE 3: STATE MANAGEMENT

### 3.1 Context Structure (Recommended: Context API)

**CartContext.jsx**
```javascript
// State: cartItems, subtotal, tax, total, discountPercentage
// Actions: addItem, removeItem, updateQuantity, clearCart, applyDiscount
```

**OrderContext.jsx**
```javascript
// State: currentOrderType (dine-in/takeaway/delivery), selectedTable, specialNotes
// Actions: setOrderType, setTable, setSplitBill
```

**UIContext.jsx**
```javascript
// State: activeModal, sidebarActive, notifications
// Actions: openModal, closeModal, showToast
```

### 3.2 Custom Hooks
- **useCart()**: Wrapper untuk CartContext
- **useOrder()**: Wrapper untuk OrderContext
- **useModal()**: Wrapper untuk modal management

---

## 📊 PHASE 4: DATA STRUCTURE & MOCK API

### 4.1 Product Data Structure
```json
{
  "id": 1,
  "name": "Ayam Geprek Pedas",
  "category": "makanan",
  "price": 66000,
  "image": "ayam-geprek.jpg",
  "variants": [
    { "id": "v1", "name": "Level 1", "priceAdjust": -2000 },
    { "id": "v2", "name": "Level 2", "priceAdjust": 0 }
  ],
  "modifiers": [
    { "id": "m1", "name": "Sambal Rendang", "price": 5000 },
    { "id": "m2", "name": "Sambal Jeruk", "price": 3000 }
  ]
}
```

### 4.2 Cart Item Data Structure
```json
{
  "id": "cart_1001",
  "productId": 1,
  "name": "Ayam Geprek Pedas Level 2",
  "quantity": 2,
  "basePrice": 66000,
  "variant": "Level 2",
  "modifiers": ["Sambal Rendang", "Sambal Jeruk"],
  "specialNotes": "",
  "subtotal": 148000
}
```

### 4.3 Order Data Structure
```json
{
  "id": "order_123",
  "items": [...cart items],
  "orderType": "dine-in",
  "tableId": "table_9",
  "subtotal": 148000,
  "tax": 14800,
  "total": 162800,
  "discount": 0,
  "paymentMethod": "cash",
  "paymentAmount": 200000,
  "change": 37200,
  "createdAt": "2025-11-13T13:15:00",
  "status": "completed"
}
```

### 4.4 Mock API Setup (services/api.js)
```javascript
// Gunakan mock data dulu, nanti ganti ke fetch() ke real backend

export const getProducts = async () => {
  // return mock data dari mockData/products.json
};

export const createOrder = async (orderData) => {
  // console.log('Order created:', orderData)
  // return { success: true, orderId: ... }
};

export const getTables = async () => {
  // return mock tables
};

export const holdOrder = async (orderData) => {
  // localStorage.setItem('held_order', JSON.stringify(orderData))
  // return success
};
```

---

## ✅ PHASE 5: FEATURE CHECKLIST

### Core Features (WAJIB ADA)
- [ ] Product grid dengan filter kategori + search
- [ ] Product detail modal (variant, modifier, qty, notes)
- [ ] Add/remove/update cart items
- [ ] Real-time cart summary (subtotal, tax, total)
- [ ] Order type selector (Dine In/Takeaway/Delivery)
- [ ] Table selection modal + confirm
- [ ] Payment modal dengan 4 metode
- [ ] Cash payment + auto change calculation
- [ ] Hold order (save draft transaksi)
- [ ] Transaksi clear/reset setelah sukses
- [ ] Error & success notifications

### UX Features
- [ ] Responsive design (desktop, tablet, mobile)
- [ ] Loading states (skeleton/spinner)
- [ ] Validasi semua input (qty min 1, total > 0, etc)
- [ ] Keyboard support (Enter submit, Esc close modal)
- [ ] Real-time clock di top bar

### Code Quality
- [ ] Modular components, no code duplication
- [ ] PropTypes atau TypeScript types
- [ ] Error boundaries
- [ ] Clean code, meaningful var names

---

## 🔗 PHASE 6: API INTEGRATION PREPARATION

### 6.1 RESTful Endpoints (backend akan implement)
```
GET    /api/products              (fetch all products)
GET    /api/products?category=X   (filter by category)
GET    /api/tables                (fetch all tables)
POST   /api/orders                (create order)
POST   /api/orders/hold           (save draft order)
GET    /api/orders/held           (get held orders)
```

### 6.2 API Service Architecture (siap untuk real API)
```javascript
// services/api.js
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const apiClient = {
  get: (endpoint) => fetch(`${BASE_URL}${endpoint}`).then(r => r.json()),
  post: (endpoint, data) => fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json())
};
```

**Nanti tinggal ganti BASE_URL dari mock ke real backend URL!**

---

## 🚀 PHASE 7: DEVELOPMENT WORKFLOW

### Step 1: Build POS Page Structure
1. Buat TopBar + QuickSidebar
2. Buat ProductGrid (mock data, hardcoded dulu)
3. Buat CartPanel (local state, useState)
4. Connect ProductCard → ProductDetailModal
5. Test add/remove/update cart

### Step 2: State Management
1. Setup CartContext, OrderContext, UIContext
2. Move local useState ke Context
3. Test state update across components

### Step 3: Modal Flows
1. Implement ProductDetailModal (variant, modifier, qty)
2. Implement TableSelectionModal
3. Implement PaymentModal dengan calculator
4. Test E2E: product → cart → table → payment

### Step 4: Features
1. Hold order functionality
2. Notification/toast system
3. Search & category filter
4. Responsive testing (mobile, tablet, desktop)

### Step 5: API Mock
1. Setup mock API di mockData/
2. Replace hardcoded data dengan fetch dari mock
3. Test semua endpoint (GET products, POST order, etc)

### Step 6: Optimization & Polish
1. Remove console.logs
2. Error boundaries
3. Loading states
4. Keyboard shortcuts
5. Performance (React.memo, useMemo where needed)

---

## 📱 RESPONSIVE REQUIREMENTS

- **Desktop (1024px+)**: Sidebar 100px + ProductGrid full + Cart 40% width, side-by-side
- **Tablet (768px-1024px)**: Sidebar top (horizontal) + ProductGrid full + Cart below (50% height)
- **Mobile (< 768px)**: Sidebar hamburger + ProductGrid/Cart stacked full-width

Test di real device atau Chrome DevTools!

---

## 🎨 DESIGN REFERENCE

- **File HTML** (`Moka-POS-Kasir.html`) adalah single source of truth untuk UI/UX
- Semua komponen React harus match styling & layout dengan HTML
- Color scheme: Primary #1E40AF (Moka blue), gray palette (9 shade)
- Typography: Header 24px, body 14px, label 12px

---

## 🧪 TESTING & QA

### Manual Testing Scenarios
1. **Add Product**: Klik product → modal → set variant → set modifier → qty 2 → add → cart update ✓
2. **Modify Cart**: Ubah qty → summary update ✓ | Remove item → remove dari cart ✓
3. **Select Table**: Dine In → klik table selector → pilih table → confirm → table name muncul ✓
4. **Payment**: Add items → bayar → select payment → input amount (cash) → change auto calc ✓
5. **Complete Order**: Pembayaran sukses → notification → cart clear → ready new order ✓
6. **Responsive**: Resize browser → layout adjust, semua button accessible ✓

### Browser Compatibility
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (Android Chrome, Safari iOS)

---

## ✨ FINAL DELIVERABLES

1. **React app folder** (src/ + public/)
2. **README.md** dengan:
   - Setup instruction
   - How to run locally
   - Environment variables (.env.example)
   - API endpoint list
   - Mock API switch instruction
3. **Component documentation** (JSDoc comments)
4. **Test screenshots** (app di desktop + tablet + mobile)
5. **Git commit history** (clean, meaningful commits)

---

## 📌 IMPORTANT NOTES

- ⚠️ **DO NOT change HTML UX/layout** → React version harus match HTML exactly
- ⚠️ **Fokus Frontend dulu** → Backend integration nanti, mock API sudah siap tempat hook
- ⚠️ **No hardcoding logic** → Semua data/state manageable, scalable untuk real data
- ⚠️ **Test kasir UX** → Workflow harus smooth, cepat, minimal click

---

## 🎯 SUCCESS CRITERIA

✅ React app 100% functional (semua fitur kasir berjalan)
✅ UI/UX identical dengan HTML prototype
✅ State management clean & scalable
✅ Mock API ready untuk switch ke real backend
✅ Responsive design tested
✅ Code quality (modular, clean, documented)
✅ Ready for production (error handling, loading states, notifications)

---

**Happy coding! 🚀**

File HTML adalah bible Anda. Build React version yang match exactly. Setelah ini beres, tinggal connect backend—struktur sudah ready!