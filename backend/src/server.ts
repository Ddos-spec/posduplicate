import express, { Express, Request, Response, NextFunction, Router } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import swaggerUi from 'swagger-ui-express';

// Load environment variables
dotenv.config();

// Import module routers
import fnbRoutes from './modules/fnb';
import accountingRoutes from './modules/accounting';
import sharedRoutes from './modules/shared';
import adminRoutes from './modules/admin';
import medsosRoutes from './modules/medsos';
import scheduler from './services/scheduler.service';
import { swaggerSpec } from './config/swagger';
import prisma from './utils/prisma';

const app: Express = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://localhost',
      'capacitor://localhost'
    ];

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  }
});

// Export io so other modules (like webhooks) can emit events
export { io };

io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

// Trust proxy (required for rate limiting behind proxies like Nginx/Easypanel)
app.set('trust proxy', 1);

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) {
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
    'X-Integration-ID',
    'Cache-Control',
    'Pragma',
    'Expires',
    'If-Modified-Since'
  ]
}));
app.use(express.json({
  limit: '1mb',
  verify: (req, _res, buffer) => {
    (req as Request).rawBody = Buffer.from(buffer);
  }
}));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(morgan('dev'));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health' || req.path === '/ready'
}));

// Accounting attachments are private and must only be downloaded through the
// authenticated, tenant-scoped attachment controller.
app.use('/uploads/accounting', (_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'File not found' }
  });
});

// Serve tenant-scoped public media (for example product images).
// Use process.cwd() to match the upload middleware path.
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
  dotfiles: 'deny',
  index: false,
  fallthrough: false,
  maxAge: '1h'
}));

// All routes live on this router so it can be mounted both at "/" (the
// mypos.my-aicustom.com subdomain) and at "/mypos" (the my-aicustom.com/mypos
// reverse-proxy path, whose prefix is NOT stripped before reaching this app).
const apiRouter: Router = Router();

// Root route
apiRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'OmniPilot AI API Server',
    version: '1.0.0',
    documentation: '/api-docs',
    modules: {
      fnb: 'Food & Beverage / POS Module',
      accounting: 'Accounting Module',
      shared: 'Shared Services (Auth, Users, Tenants, etc.)',
      admin: 'Admin & Analytics',
      medsos: 'Social Media Management'
    },
    endpoints: {
      health: '/health',
      docs: '/api-docs',
      docsJson: '/api-docs.json',
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
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'OK',
    message: 'OmniPilot AI API is running',
    timestamp: new Date().toISOString()
  });
});

apiRouter.get('/ready', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({
      status: 'READY',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Readiness check failed:', error);
    return res.status(503).json({
      status: 'NOT_READY',
      database: 'unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// API Documentation (Swagger)
apiRouter.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'OmniPilot AI API Documentation'
}));

// Swagger JSON endpoint
apiRouter.get('/api-docs.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// API Routes - Organized by Module
// Shared/Common Routes (Auth, Users, Tenants, Settings, etc.)
apiRouter.use('/api', sharedRoutes);

// FnB/POS Module Routes
apiRouter.use('/api', fnbRoutes);

// Accounting Module Routes
apiRouter.use('/api/accounting', accountingRoutes);

// Admin Module Routes
apiRouter.use('/api/admin', adminRoutes);

// Medsos Module Routes
apiRouter.use('/api/medsos', medsosRoutes);

// 404 Handler
apiRouter.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`
    }
  });
});

// Mount the router under /mypos (path-based access via my-aicustom.com/mypos,
// whose prefix Traefik forwards verbatim) before mounting it at root
// (subdomain access) — the root mount's "/" prefix matches every path, so it
// must come second or it swallows /mypos/* requests before they get there.
app.use('/mypos', apiRouter);
app.use('/', apiRouter);

// Error Handler
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);

  // Simple File Logging for easier debugging
  try {
    const safeMessage = String(err.message || 'Unknown error').replace(/[\r\n]/g, ' ');
    const stack = process.env.NODE_ENV === 'development' ? `\nStack: ${err.stack}` : '';
    const logMessage = `[${new Date().toISOString()}] ${req.method} ${req.path} - Error: ${safeMessage}${stack}\n\n`;
    fs.appendFile(path.join(__dirname, '../server-error.log'), logMessage, (logErr) => {
      if (logErr) console.error('Failed to write to error log file:', logErr);
    });
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

// Start server using httpServer to support websockets.
// Tests import the Express app directly; do not bind a real port or start schedulers there.
if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => {
    scheduler.start();
    console.log(`🚀 OmniPilot AI API Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Internal health check: http://localhost:${PORT}/health`);
  });
}

export default app;
