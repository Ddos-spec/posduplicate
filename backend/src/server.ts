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

dotenv.config();

import fnbRoutes from './modules/fnb';
import accountingRoutes from './modules/accounting';
import sharedRoutes from './modules/shared';
import adminRoutes from './modules/admin';
import medsosRoutes from './modules/medsos';
import productivityRoutes from './modules/productivity';
import learningRoutes from './modules/learning';
import scheduler from './services/scheduler.service';
import { swaggerSpec } from './config/swagger';
import { jsonBigIntReplacer } from './utils/json';
import prisma from './utils/prisma';

const app: Express = express();
app.set('json replacer', jsonBigIntReplacer);
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
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

export { io };

io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
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
    'If-Modified-Since',
    'X-Order-Token',
    'X-Engagement-Token',
    'X-Sign-Token',
    'X-Learning-Token',
    'X-Community-Token',
    'Idempotency-Key'
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

const apiRouter: Router = Router();

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
      medsos: 'Social Media Management',
      productivity: 'Documents, Knowledge & Sign',
      learning: 'eLearning & Community Forum'
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
      admin: '/api/admin',
      productivity: '/api/productivity',
      learning: '/api/learning'
    },
    timestamp: new Date().toISOString()
  });
});

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

apiRouter.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'OmniPilot AI API Documentation'
}));

apiRouter.get('/api-docs.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

apiRouter.use('/api', sharedRoutes);
apiRouter.use('/api', fnbRoutes);
apiRouter.use('/api/accounting', accountingRoutes);
apiRouter.use('/api/admin', adminRoutes);
apiRouter.use('/api/medsos', medsosRoutes);
apiRouter.use('/api/productivity', productivityRoutes);
apiRouter.use('/api/learning', learningRoutes);

apiRouter.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`
    }
  });
});

app.use('/mypos', apiRouter);
app.use('/', apiRouter);

app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const status = Number.isInteger(err?.status) && err.status >= 400 && err.status <= 599
    ? err.status
    : 500;
  const safeMessage = String(err?.message || 'Unknown error').replace(/[\r\n]/g, ' ');
  console.error('Request failed', {
    method: req.method,
    path: req.path,
    status,
    name: err instanceof Error ? err.name : 'UnknownError',
  });

  try {
    const stack = process.env.NODE_ENV === 'development' ? `\nStack: ${err.stack}` : '';
    const logMessage = `[${new Date().toISOString()}] ${req.method} ${req.path} - Error: ${safeMessage}${stack}\n\n`;
    fs.appendFile(path.join(__dirname, '../server-error.log'), logMessage, (logErr) => {
      if (logErr) console.error('Failed to write to error log file:', logErr);
    });
  } catch (logErr) {
    console.error('Failed to write to error log file:', logErr);
  }

  const exposeDetails = status < 500 || process.env.NODE_ENV === 'development';
  res.status(status).json({
    success: false,
    error: {
      code: exposeDetails ? (err.code || 'REQUEST_FAILED') : 'INTERNAL_SERVER_ERROR',
      message: exposeDetails ? safeMessage : 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => {
    scheduler.start();
    console.log(`🚀 OmniPilot AI API Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Internal health check: http://localhost:${PORT}/health`);
  });
}

export default app;
