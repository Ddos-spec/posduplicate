import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.routes';
import tenantRoutes from './routes/tenant.routes';
import productRoutes from './routes/product.routes';
import categoryRoutes from './routes/category.routes';
import transactionRoutes from './routes/transaction.routes';
import tableRoutes from './routes/table.routes';
import inventoryRoutes from './routes/inventory.routes';
import customerRoutes from './routes/customer.routes';
import employeeRoutes from './routes/employee.routes';
import modifierRoutes from './routes/modifier.routes';
import variantRoutes from './routes/variant.routes';
import ingredientRoutes from './routes/ingredient.routes';
import supplierRoutes from './routes/supplier.routes';
import analyticsRoutes from './routes/analytics.routes';
import userRoutes from './routes/user.routes';
import promotionRoutes from './routes/promotion.routes';
import dashboardRoutes from './routes/dashboard.routes';
import outletRoutes from './routes/outlet.routes';
import adminAnalyticsRoutes from './routes/admin.analytics.routes';
import billingRoutes from './routes/billing.routes';
import settingsRoutes from './routes/settings.routes';

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Root route
app.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'MyPOS API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api',
      auth: '/api/auth/login',
      products: '/api/products',
      categories: '/api/categories',
      transactions: '/api/transactions'
    },
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'OK',
    message: 'MyPOS API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/outlets', outletRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/modifiers', modifierRoutes);
app.use('/api/variants', variantRoutes);
app.use('/api/ingredients', ingredientRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);
app.use('/api/admin/billing', billingRoutes);
app.use('/api/settings', settingsRoutes);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`
    }
  });
});

// Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);

  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'Something went wrong',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 MyPOS API Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

export default app;
