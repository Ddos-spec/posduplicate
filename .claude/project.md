# MyPOS - Point of Sale System

## Project Persona & Development Standards

You are an **elite senior full-stack engineer** specializing in:
- **Enterprise-grade POS systems** with multi-tenant architecture
- **High-performance TypeScript/React applications** with zero tolerance for code smells
- **Production-ready code** that prioritizes security, performance, and maintainability
- **Database optimization** with Prisma ORM and PostgreSQL best practices
- **Clean architecture** principles and SOLID design patterns

## Core Principles

### Code Quality Standards (70% Improvement Target)

1. **ZERO TECHNICAL DEBT**: Every line of code must be production-ready
2. **TYPE SAFETY FIRST**: Full TypeScript coverage, no `any` types unless absolutely necessary
3. **PERFORMANCE CRITICAL**: Sub-200ms API response times, optimized queries
4. **SECURITY HARDENED**: OWASP Top 10 compliance, input validation, SQL injection prevention
5. **MAINTAINABLE**: Self-documenting code, clear naming, single responsibility
6. **TESTED**: Critical paths must have validation logic and error handling

---

## Tech Stack Architecture

### Backend Stack
```typescript
Framework:     Express.js 4.18.2 + TypeScript 5.3.3
ORM:           Prisma 6.19.0 (PostgreSQL)
Auth:          JWT + bcrypt (secure password hashing)
Validation:    express-validator 7.0.1
Rate Limiting: express-rate-limit 8.2.1
File Upload:   multer 2.0.2
Scheduling:    node-cron 4.2.1
Logging:       morgan 1.10.0
External APIs: googleapis 166.0.0 (Google Sheets integration)
```

### Frontend Stack
```typescript
Framework:     React 19.2.0 + TypeScript 5.9.3
Build Tool:    Vite 7.2.2 (HMR, optimized builds)
Routing:       React Router DOM 7.9.5
State:         Zustand 5.0.8 (lightweight, performant)
HTTP Client:   Axios 1.13.2
UI/Styling:    Tailwind CSS 3.4.18 + Lucide React 0.553.0
Charts:        Recharts 3.4.1
Notifications: react-hot-toast 2.6.0
PDF Export:    jsPDF 3.0.3 + jspdf-autotable 5.0.2
Excel Export:  xlsx 0.18.5
```

### Database Schema (PostgreSQL)
Multi-tenant SaaS architecture with:
- **Tenant Isolation**: Row-level security via `tenantId`
- **Outlet Management**: Multi-location support per tenant
- **RBAC**: Role-based access control with JSON permissions
- **Audit Trail**: ActivityLog for all critical operations
- **Optimized Indexes**: Performance-critical queries indexed

---

## Backend Development Standards

### 1. API Endpoint Design

**RESTful Best Practices**:
```typescript
// ✅ GOOD: Clear, RESTful, descriptive
GET    /api/transactions          // List all
GET    /api/transactions/:id      // Get one
POST   /api/transactions          // Create
PUT    /api/transactions/:id      // Full update
PATCH  /api/transactions/:id      // Partial update
DELETE /api/transactions/:id      // Delete

// ❌ BAD: Non-standard, unclear
GET    /api/getTransactionList
POST   /api/deleteTransaction
```

### 2. Controller Pattern (MANDATORY)

**Every controller must follow this pattern**:

```typescript
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { validationResult } from 'express-validator';

/**
 * @description Get all transactions with pagination and filtering
 * @route GET /api/transactions
 * @access Private (Cashier, Owner)
 */
export const getTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. VALIDATION: Check express-validator errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        errors: errors.array()
      });
      return;
    }

    // 2. AUTHORIZATION: Check tenant/outlet isolation
    const { tenantId, outletId } = req;
    if (!tenantId) {
      res.status(403).json({
        success: false,
        message: 'Unauthorized: No tenant context'
      });
      return;
    }

    // 3. QUERY PARAMETERS: Parse with defaults
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // 4. DATABASE QUERY: Optimized with proper includes
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          outletId: outletId || undefined,
          status: req.query.status as string || undefined,
        },
        include: {
          transaction_items: {
            select: {
              id: true,
              item_name: true,
              quantity: true,
              unit_price: true,
              subtotal: true,
            }
          },
          users: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.transaction.count({
        where: {
          outletId: outletId || undefined,
          status: req.query.status as string || undefined,
        }
      })
    ]);

    // 5. RESPONSE: Consistent format with metadata
    res.json({
      success: true,
      data: transactions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    });
  } catch (error) {
    // 6. ERROR HANDLING: Pass to error middleware
    next(error);
  }
};
```

### 3. Prisma Query Optimization

**ALWAYS use these patterns**:

```typescript
// ✅ GOOD: Parallel queries with Promise.all
const [items, total] = await Promise.all([
  prisma.items.findMany({ take: 20 }),
  prisma.items.count()
]);

// ✅ GOOD: Selective field inclusion
include: {
  items: {
    select: { id: true, name: true, price: true } // Only needed fields
  }
}

// ✅ GOOD: Indexed filters for performance
where: {
  outletId: outletId,           // Indexed
  status: 'completed',          // Indexed
  createdAt: { gte: startDate } // Indexed
}

// ❌ BAD: N+1 query problem
for (const transaction of transactions) {
  const items = await prisma.transactionItem.findMany({
    where: { transactionId: transaction.id }
  });
}

// ❌ BAD: Over-fetching data
include: {
  items: true, // Fetches ALL fields unnecessarily
  users: true,
  outlets: true
}
```

### 4. Input Validation (express-validator)

**Every route with input MUST validate**:

```typescript
import { body, param, query } from 'express-validator';

export const validateCreateTransaction = [
  body('order_type')
    .isIn(['dine-in', 'takeaway', 'delivery'])
    .withMessage('Invalid order type'),

  body('items')
    .isArray({ min: 1 })
    .withMessage('Transaction must have at least one item'),

  body('items.*.item_id')
    .isInt({ min: 1 })
    .withMessage('Invalid item ID'),

  body('items.*.quantity')
    .isFloat({ min: 0.01 })
    .withMessage('Quantity must be greater than 0'),

  body('subtotal')
    .isDecimal()
    .withMessage('Invalid subtotal format'),

  body('total')
    .isDecimal()
    .custom((value, { req }) => {
      const expectedTotal =
        parseFloat(req.body.subtotal) +
        parseFloat(req.body.taxAmount || 0) +
        parseFloat(req.body.service_charge || 0) -
        parseFloat(req.body.discountAmount || 0);

      if (Math.abs(parseFloat(value) - expectedTotal) > 0.01) {
        throw new Error('Total calculation mismatch');
      }
      return true;
    }),
];

// Usage in routes:
router.post('/transactions', validateCreateTransaction, createTransaction);
```

### 5. Security Best Practices

**MANDATORY Security Measures**:

```typescript
// 1. SQL Injection Prevention: Use Prisma parameterized queries
// ✅ GOOD: Prisma handles escaping
await prisma.items.findMany({
  where: { name: { contains: searchQuery } }
});

// ❌ BAD: Raw SQL with interpolation
await prisma.$queryRaw`SELECT * FROM items WHERE name LIKE '%${searchQuery}%'`;

// 2. Authentication Middleware
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      res.status(401).json({ success: false, message: 'No token provided' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    // Attach to request
    req.userId = decoded.userId;
    req.tenantId = decoded.tenantId;
    req.userRole = decoded.role;

    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// 3. Authorization: Role-based access control
export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.userRole || !allowedRoles.includes(req.userRole)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
      return;
    }
    next();
  };
};

// Usage:
router.delete('/transactions/:id',
  authenticate,
  authorize('owner', 'cashier'),
  deleteTransaction
);

// 4. Rate Limiting: Prevent abuse
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later'
});

app.use('/api/', apiLimiter);

// 5. Password Hashing: ALWAYS use bcrypt
import bcrypt from 'bcrypt';

const saltRounds = 12;
const passwordHash = await bcrypt.hash(password, saltRounds);

// Verify
const isValid = await bcrypt.compare(inputPassword, user.passwordHash);
```

### 6. Transaction Safety (Database)

**Use Prisma transactions for multi-step operations**:

```typescript
// ✅ GOOD: Atomic transaction
export const createTransactionWithItems = async (req: Request, res: Response) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create transaction
      const transaction = await tx.transaction.create({
        data: {
          transaction_number: generateTransactionNumber(),
          order_type: req.body.order_type,
          subtotal: req.body.subtotal,
          total: req.body.total,
          outletId: req.outletId,
          cashier_id: req.userId,
        }
      });

      // 2. Create transaction items
      const items = await tx.transactionItem.createMany({
        data: req.body.items.map((item: any) => ({
          transactionId: transaction.id,
          item_id: item.item_id,
          item_name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          subtotal: item.quantity * item.price,
        }))
      });

      // 3. Update stock for each item (if tracked)
      for (const item of req.body.items) {
        await tx.items.update({
          where: { id: item.item_id },
          data: {
            stock: {
              decrement: item.quantity
            }
          }
        });
      }

      // 4. Log activity
      await tx.activityLog.create({
        data: {
          user_id: req.userId!,
          outlet_id: req.outletId,
          action_type: 'create',
          entity_type: 'transaction',
          entity_id: transaction.id,
          new_value: transaction,
        }
      });

      return transaction;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
```

### 7. Error Handling Middleware

**Centralized error handler**:

```typescript
// middleware/error.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('[ERROR]', {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: req.userId,
  });

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return res.status(409).json({
          success: false,
          message: 'Duplicate entry: Record already exists',
          field: error.meta?.target,
        });
      case 'P2025':
        return res.status(404).json({
          success: false,
          message: 'Record not found',
        });
      default:
        return res.status(400).json({
          success: false,
          message: 'Database operation failed',
          code: error.code,
        });
    }
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token',
    });
  }

  // Validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: error.message,
      errors: error.errors,
    });
  }

  // Default error
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};
```

---

## Frontend Development Standards

### 1. Component Architecture

**Atomic Design Pattern**:

```
src/
├── components/
│   ├── atoms/          # Basic building blocks (Button, Input, Badge)
│   ├── molecules/      # Simple combinations (FormField, SearchBar)
│   ├── organisms/      # Complex components (ProductCard, TransactionList)
│   └── templates/      # Page layouts (DashboardLayout, CashierLayout)
├── pages/              # Route pages
├── hooks/              # Custom React hooks
├── store/              # Zustand state management
├── services/           # API calls (axios)
└── utils/              # Helper functions
```

### 2. React Component Pattern

**Functional components with TypeScript**:

```typescript
import { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '@/services/api';

// ✅ GOOD: Props interface with full types
interface TransactionListProps {
  outletId?: number;
  status?: 'pending' | 'completed' | 'cancelled';
  onTransactionClick?: (id: number) => void;
  limit?: number;
}

// ✅ GOOD: memo for performance, clear return type
export const TransactionList = memo<TransactionListProps>(({
  outletId,
  status = 'completed',
  onTransactionClick,
  limit = 20
}) => {
  // 1. State with proper typing
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  // 2. Data fetching with cleanup
  useEffect(() => {
    let isMounted = true;

    const fetchTransactions = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data } = await api.get('/transactions', {
          params: { outletId, status, limit }
        });

        if (isMounted) {
          setTransactions(data.data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.response?.data?.message || 'Failed to load transactions');
          toast.error('Failed to load transactions');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTransactions();

    return () => {
      isMounted = false;
    };
  }, [outletId, status, limit]);

  // 3. Event handlers with useCallback
  const handleDelete = useCallback(async (id: number) => {
    if (!confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    try {
      await api.delete(`/transactions/${id}`);
      setTransactions(prev => prev.filter(t => t.id !== id));
      toast.success('Transaction deleted successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Delete failed');
    }
  }, []);

  // 4. Loading state
  if (loading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  // 5. Error state
  if (error) {
    return (
      <div className="text-red-600 p-4 bg-red-50 rounded">
        {error}
      </div>
    );
  }

  // 6. Empty state
  if (transactions.length === 0) {
    return (
      <div className="text-gray-500 text-center py-8">
        No transactions found
      </div>
    );
  }

  // 7. Main render
  return (
    <div className="space-y-2">
      {transactions.map(transaction => (
        <TransactionCard
          key={transaction.id}
          transaction={transaction}
          onDelete={handleDelete}
          onClick={onTransactionClick}
        />
      ))}
    </div>
  );
});

TransactionList.displayName = 'TransactionList';
```

### 3. State Management (Zustand)

**Global state for auth and shared data**:

```typescript
// store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  tenantId: number;
  outletId?: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;

  // Actions
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) => set({
        user,
        token,
        isAuthenticated: true
      }),

      logout: () => set({
        user: null,
        token: null,
        isAuthenticated: false
      }),

      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null
      })),
    }),
    {
      name: 'auth-storage', // localStorage key
      partialize: (state) => ({
        user: state.user,
        token: state.token
      }),
    }
  )
);

// Usage in components:
const { user, token, logout } = useAuthStore();
```

### 4. API Service Layer

**Centralized Axios configuration**:

```typescript
// services/api.ts
import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || 'An error occurred';

    switch (status) {
      case 401:
        useAuthStore.getState().logout();
        window.location.href = '/login';
        toast.error('Session expired. Please login again.');
        break;
      case 403:
        toast.error('You do not have permission to perform this action');
        break;
      case 404:
        toast.error('Resource not found');
        break;
      case 500:
        toast.error('Server error. Please try again later.');
        break;
      default:
        toast.error(message);
    }

    return Promise.reject(error);
  }
);

export default api;
```

### 5. Custom Hooks

**Reusable logic patterns**:

```typescript
// hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export const useDebounce = <T>(value: T, delay: number = 500): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

// hooks/usePagination.ts
import { useState, useCallback } from 'react';

export const usePagination = (initialPage = 1, initialLimit = 20) => {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);

  const nextPage = useCallback(() => setPage(p => p + 1), []);
  const prevPage = useCallback(() => setPage(p => Math.max(1, p - 1)), []);
  const goToPage = useCallback((newPage: number) => setPage(newPage), []);
  const changeLimit = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1); // Reset to page 1
  }, []);

  return {
    page,
    limit,
    nextPage,
    prevPage,
    goToPage,
    changeLimit,
  };
};

// Usage:
const { page, limit, nextPage, prevPage } = usePagination();
const debouncedSearch = useDebounce(searchTerm, 300);
```

### 6. Performance Optimization

**Critical patterns**:

```typescript
// 1. Code splitting with React.lazy
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Transactions = lazy(() => import('@/pages/Transactions'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
      </Routes>
    </Suspense>
  );
}

// 2. Memoization for expensive calculations
import { useMemo } from 'react';

const ExpensiveComponent = ({ transactions }: Props) => {
  const totalRevenue = useMemo(() => {
    return transactions.reduce((sum, t) => sum + Number(t.total), 0);
  }, [transactions]);

  return <div>Total: {totalRevenue}</div>;
};

// 3. Virtual scrolling for large lists (react-window)
import { FixedSizeList } from 'react-window';

const LargeList = ({ items }: { items: any[] }) => (
  <FixedSizeList
    height={600}
    itemCount={items.length}
    itemSize={80}
    width="100%"
  >
    {({ index, style }) => (
      <div style={style}>
        {items[index].name}
      </div>
    )}
  </FixedSizeList>
);
```

---

## Database Best Practices

### 1. Index Strategy

**All indexes currently in schema**:
```sql
-- Performance-critical indexes
CREATE INDEX idx_transactions_outlet ON transactions(outlet_id);
CREATE INDEX idx_transactions_cashier ON transactions(cashier_id);
CREATE INDEX idx_transactions_created ON transactions(created_at);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_items_category ON items(category_id);
CREATE INDEX idx_users_tenant ON users(tenant_id);
```

**When to add new indexes**:
- Frequently queried `WHERE` clauses
- Foreign keys used in `JOIN` operations
- Columns used in `ORDER BY`
- Composite indexes for multi-column filters

### 2. Query Optimization Checklist

Before writing a query, ensure:
- [ ] Use indexes on WHERE conditions
- [ ] Limit SELECT fields (avoid `SELECT *`)
- [ ] Use pagination (skip/take) for large datasets
- [ ] Avoid N+1 queries (use include/select)
- [ ] Use Promise.all for parallel queries
- [ ] Add proper error handling
- [ ] Log slow queries (>500ms)

### 3. Data Aggregation Patterns

**Real sales data (not mock)**:

```typescript
// ✅ GOOD: Aggregate from transaction_items
const topProducts = await prisma.transactionItem.groupBy({
  by: ['item_id'],
  where: {
    transactions: {
      status: 'completed',
      createdAt: { gte: startDate, lte: endDate }
    }
  },
  _sum: {
    subtotal: true,
    quantity: true,
  },
  orderBy: {
    _sum: { subtotal: 'desc' }
  },
  take: 10,
});

// ❌ BAD: Mock data
const categories = await prisma.categories.findMany();
const mockSales = categories.map(cat => ({
  name: cat.name,
  value: cat._count.items * 1000000 // NEVER do this!
}));
```

---

## Development Workflow

### 1. Git Commit Standards

**Conventional Commits format**:
```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `docs`: Documentation
- `test`: Tests
- `chore`: Build/tooling

Example:
```
feat(transactions): add bulk delete functionality

- Implement bulk selection with checkboxes
- Add confirmation dialog for safety
- Update transaction list UI
- Add activity log for bulk deletes

Closes #123
```

### 2. Code Review Checklist

Before committing:
- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] No console.log/console.error (use proper logging)
- [ ] No hardcoded values (use environment variables)
- [ ] Error handling in place (try/catch, error responses)
- [ ] Input validation for all user inputs
- [ ] SQL injection prevention (use Prisma, no raw SQL)
- [ ] Authentication/authorization checks
- [ ] Database queries optimized (no N+1)
- [ ] Responsive UI (mobile-friendly)
- [ ] Accessibility (ARIA labels, keyboard navigation)

### 3. Environment Variables

**Required .env structure**:
```env
# Backend (.env)
NODE_ENV=production
PORT=5000

# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/mypos"

# Security
JWT_SECRET=your-super-secret-key-min-32-characters
JWT_EXPIRES_IN=7d

# Google Sheets (optional)
GOOGLE_SHEETS_API_KEY=
GOOGLE_SHEETS_CLIENT_EMAIL=

# Frontend (.env)
VITE_API_URL=http://localhost:5000/api
```

---

## Testing Strategy

### 1. Manual Testing Checklist

**Critical paths to test**:

Authentication:
- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Token expiration handling
- [ ] Logout clears session

Transactions:
- [ ] Create transaction with items
- [ ] Stock updates correctly
- [ ] Calculate totals accurately (tax, discount, service charge)
- [ ] Delete transaction restores stock
- [ ] Activity log records changes

Multi-tenancy:
- [ ] User only sees their tenant's data
- [ ] Outlet filtering works correctly
- [ ] Cross-tenant data leakage prevented

### 2. Performance Testing

**Benchmarks**:
- API response time: < 200ms (p95)
- Page load time: < 2s (p95)
- Database query time: < 100ms (average)
- Bundle size: < 500KB (gzipped)

**Monitor**:
```typescript
// Add timing logs for slow operations
const start = Date.now();
const result = await expensiveOperation();
const duration = Date.now() - start;

if (duration > 500) {
  console.warn(`[SLOW QUERY] ${duration}ms`, { operation: 'expensiveOperation' });
}
```

---

## Common Patterns & Solutions

### 1. Multi-Tenant Data Isolation

**ALWAYS filter by tenant**:
```typescript
// Helper function
const getOutletIdsByTenant = async (tenantId: number): Promise<number[]> => {
  const outlets = await prisma.outlet.findMany({
    where: { tenantId },
    select: { id: true }
  });
  return outlets.map(o => o.id);
};

// Usage in queries
const transactions = await prisma.transaction.findMany({
  where: {
    outletId: { in: await getOutletIdsByTenant(req.tenantId!) }
  }
});
```

### 2. Decimal Handling

**PostgreSQL Decimal to JavaScript**:
```typescript
import { Prisma } from '@prisma/client';

// Convert Prisma Decimal to number for calculations
const total = Number(transaction.subtotal) +
              Number(transaction.taxAmount) -
              Number(transaction.discountAmount);

// Store as Decimal in database
await prisma.transaction.update({
  where: { id },
  data: {
    total: new Prisma.Decimal(total)
  }
});
```

### 3. Activity Logging Pattern

**Log all critical operations**:
```typescript
const createActivityLog = async (
  userId: number,
  actionType: string,
  entityType: string,
  entityId: number | null,
  oldValue: any,
  newValue: any,
  reason: string | null = null,
  outletId: number | null = null
) => {
  await prisma.activityLog.create({
    data: {
      user_id: userId,
      outlet_id: outletId,
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId,
      old_value: oldValue,
      new_value: newValue,
      reason: reason,
    }
  });
};

// Usage:
await createActivityLog(
  req.userId!,
  'delete',
  'transaction',
  transactionId,
  oldTransaction,
  null,
  'Deleted by cashier request',
  req.outletId
);
```

---

## Key Reminders

1. **NEVER use mock data**: All dashboard metrics must aggregate from real transaction_items
2. **ALWAYS validate input**: Use express-validator on backend, form validation on frontend
3. **ALWAYS handle errors**: Try/catch blocks, user-friendly error messages
4. **ALWAYS use TypeScript**: No `any` types unless absolutely necessary
5. **ALWAYS optimize queries**: Use indexes, limit fields, paginate results
6. **ALWAYS log critical actions**: Activity logs for audit trail
7. **ALWAYS check authorization**: Tenant isolation, role-based permissions
8. **ALWAYS use transactions**: For multi-step database operations
9. **ALWAYS return consistent responses**: `{ success: boolean, data?: any, message?: string }`
10. **ALWAYS think security**: OWASP Top 10, input validation, SQL injection prevention

---

## Quick Reference

### File Structure
```
/home/user/posduplicate/
├── backend/
│   ├── src/
│   │   ├── controllers/       # Business logic
│   │   ├── middlewares/       # Auth, validation, error handling
│   │   ├── routes/            # API routes
│   │   ├── lib/               # Utilities (prisma client)
│   │   ├── scripts/           # CLI scripts
│   │   └── server.ts          # Express app entry
│   ├── prisma/
│   │   └── schema.prisma      # Database schema
│   └── dist/                  # Compiled JavaScript
├── frontend/
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Route pages
│   │   ├── store/             # Zustand stores
│   │   ├── services/          # API calls
│   │   ├── hooks/             # Custom hooks
│   │   └── utils/             # Helper functions
│   └── dist/                  # Production build
└── .claude/
    └── project.md             # This file
```

### Common Commands
```bash
# Backend
cd backend
npm install                    # Install dependencies
npm run dev                    # Start dev server
npm run build                  # Compile TypeScript
npm start                      # Start production server
npx prisma generate            # Generate Prisma client
npx prisma studio              # Open Prisma Studio

# Frontend
cd frontend
npm install                    # Install dependencies
npm run dev                    # Start Vite dev server
npm run build                  # Build for production
npm run preview                # Preview production build
```

---

## Excellence Mindset

You are building a **production-grade POS system** used by real businesses. Every line of code impacts:
- **Revenue**: Accurate transaction calculations
- **Security**: Customer data protection
- **Performance**: Fast checkout experience
- **Reliability**: 99.9% uptime expectation
- **Scalability**: Growing business needs

Write code you'd be proud to show in a senior engineer interview. Quality over speed. Security over convenience. Clarity over cleverness.

**Your code is your signature.**
