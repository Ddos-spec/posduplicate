import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Import module routers
import fnbRoutes from './modules/fnb';
import accountingRoutes from './modules/accounting';
import sharedRoutes from './modules/shared';
import adminRoutes from './modules/admin';

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
    modules: {
      fnb: 'Food & Beverage / POS Module',
      accounting: 'Accounting Module',
      shared: 'Shared Services (Auth, Users, Tenants, etc.)',
      admin: 'Admin & Analytics'
    },
    endpoints: {
      health: '/health',
      api: '/api',
      auth: '/api/auth/login',
      products: '/api/products',
      categories: '/api/categories',
      transactions: '/api/transactions',
      accounting: '/api/accounting',
      admin: '/api/admin'
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

// API Routes - Organized by Module
// Shared/Common Routes (Auth, Users, Tenants, Settings, etc.)
app.use('/api', sharedRoutes);

// FnB/POS Module Routes
app.use('/api', fnbRoutes);

// Accounting Module Routes
app.use('/api/accounting', accountingRoutes);

// Admin Module Routes
app.use('/api/admin', adminRoutes);

// DEBUG endpoints removed for security
// Use proper logging and monitoring service in production

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
  console.log(`🔄 Server Restart Triggered at: ${new Date().toISOString()}`);
  console.log(`🔗 Internal health check: http://localhost:${PORT}/health`);
  console.log(`📦 Modular Structure:`);
  console.log(`   ├─ FnB/POS Module`);
  console.log(`   ├─ Accounting Module`);
  console.log(`   ├─ Shared Services`);
  console.log(`   └─ Admin Module`);

  if (process.env.NODE_ENV === 'production') {
    console.log(`🌐 CORS Origin: ${process.env.CORS_ORIGIN || 'Not set'}`);
    console.log(`ℹ️  External access via reverse proxy (EasyPanel/Nginx)`);
  }
});

export default app;
