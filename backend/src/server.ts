import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

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
import modifierRoutes from './routes/modifier.routes';
import variantRoutes from './routes/variant.routes';
import recipeRoutes from './routes/recipe.routes';
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
import uploadRoutes from './routes/upload.routes';
import notificationRoutes from './routes/notification.routes';
import shiftRoutes from './routes/shift.routes';
import activityLogRoutes from './routes/activity-log.routes';
import ownerApiRoutes from './routes/ownerApi.routes';
import printerSettingsRoutes from './routes/printerSettings.routes';
import apiKeyRoutes from './routes/apiKey.routes';
import inventoryModuleRoutes from './routes/inventory-module.routes';
import salesAnalyticsRoutes from './routes/sales-analytics.routes';
import integrationRoutes from './routes/integration.routes';

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (required for rate limiting behind proxies like Nginx/Easypanel)
app.set('trust proxy', 1);

// Middleware
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) {
      callback(null, true);
      return;
    }

    // Allow all Vercel deployments
    if (origin.includes('.vercel.app')) {
      callback(null, true);
      return;
    }

    // Allow configured origins
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    // Reject other origins
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Tenant-ID',
    'Cache-Control',
    'Pragma',
    'Expires',
    'If-Modified-Since'
  ]
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Serve static files from uploads directory
// Use process.cwd() to match the upload middleware path
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));



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
app.use('/api/modifiers', modifierRoutes);
app.use('/api/variants', variantRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/ingredients', ingredientRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);
app.use('/api/admin/billing', billingRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/activity-logs', activityLogRoutes);
app.use('/api/owner', ownerApiRoutes);
app.use('/api/printer-settings', printerSettingsRoutes);
app.use('/api/api-keys', apiKeyRoutes);
app.use('/api/inventory-module', inventoryModuleRoutes);
app.use('/api/sales-analytics', salesAnalyticsRoutes);
app.use('/api/integrations', integrationRoutes);

// DEBUG: View Error Logs directly from browser
// Usage: /api/debug/logs?key=admin123
app.get('/api/debug/logs', (req: Request, res: Response) => {
  const secretKey = req.query.key;
  
  // Simple security check
  if (secretKey !== 'admin123') {
    return res.status(403).send('Forbidden: Invalid Key');
  }

  const logPath = path.join(__dirname, '../server-error.log');

  if (fs.existsSync(logPath)) {
    const logs = fs.readFileSync(logPath, 'utf-8');
    // Display as plain text for easy reading
    res.set('Content-Type', 'text/plain');
    return res.send(logs);
  } else {
    return res.send('No errors logged yet. File server-error.log does not exist.');
  }
});

// DEBUG: Check uploads folder content and permissions
app.get('/api/debug/check-uploads', (req: Request, res: Response) => {
  const secretKey = req.query.key;
  if (secretKey !== 'admin123') {
    res.status(403).send('Forbidden');
    return;
  }

  const uploadPath = path.join(process.cwd(), 'uploads');
  
  try {
    const files = fs.readdirSync(uploadPath);
    const stats = fs.statSync(uploadPath);
    
    res.json({
      process: {
        cwd: process.cwd(),
        uid: process.getuid ? process.getuid() : 'N/A',
        gid: process.getgid ? process.getgid() : 'N/A',
      },
      directory: {
        path: uploadPath,
        exists: fs.existsSync(uploadPath),
        permissions: stats.mode,
        owner_uid: stats.uid,
        owner_gid: stats.gid,
      },
      files: files,
      message: "If 'files' is empty or your logo is missing here, the Volume is NOT mounted correctly."
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      stack: error.stack,
      path: uploadPath
    });
  }
});

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
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);

  // Simple File Logging for easier debugging without asking AI
  try {
    const logMessage = `[${new Date().toISOString()}] ${req.method} ${req.path} - Error: ${err.message}\nStack: ${err.stack}\n\n`;
    fs.appendFileSync(path.join(__dirname, '../server-error.log'), logMessage);
  } catch (logErr) {
    console.error('Failed to write to error log file:', logErr);
  }

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
  console.log(`🔄 Server Restart Triggered at: ${new Date().toISOString()}`); // Trigger restart
  console.log(`🔗 Internal health check: http://localhost:${PORT}/health`);

  if (process.env.NODE_ENV === 'production') {
    console.log(`🌐 CORS Origin: ${process.env.CORS_ORIGIN || 'Not set'}`);
    console.log(`ℹ️  External access via reverse proxy (EasyPanel/Nginx)`);
  }
});

export default app;
