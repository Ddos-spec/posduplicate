import express, { Express, Request, Response, NextFunction, Router } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import morgan from 'morgan';
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
import scheduler from './services/scheduler.service';
import { swaggerSpec } from './config/swagger';

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

export { io };

io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

app.set('trust proxy', 1);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (origin.includes('.vercel.app')) {
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
    'Cache-Control',
    'Pragma',
    'Expires',
    'If-Modified-Since',
    'X-Order-Token',
    'X-Engagement-Token'
  ]
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

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
      productivity: 'Documents, Knowledge & Sign'
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
      productivity: '/api/productivity'
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
  console.error('Error:', err);

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

if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => {
    scheduler.start();
    console.log(`🚀 OmniPilot AI API Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Internal health check: http://localhost:${PORT}/health`);
  });
}

export default app;
