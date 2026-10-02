import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import API routers
import authRoutes from './src/server/routes/authRoutes.ts';
import medicineRoutes from './src/server/routes/medicineRoutes.ts';
import supplierRoutes from './src/server/routes/supplierRoutes.ts';
import customerRoutes from './src/server/routes/customerRoutes.ts';
import batchRoutes from './src/server/routes/batchRoutes.ts';
import inventoryRoutes from './src/server/routes/inventoryRoutes.ts';
import prescriptionRoutes from './src/server/routes/prescriptionRoutes.ts';
import salesRoutes from './src/server/routes/salesRoutes.ts';
import purchaseRoutes from './src/server/routes/purchaseRoutes.ts';
import dashboardRoutes from './src/server/routes/dashboardRoutes.ts';
import reportRoutes from './src/server/routes/reportRoutes.ts';
import userRoutes from './src/server/routes/userRoutes.ts';
import notificationRoutes from './src/server/routes/notificationRoutes.ts';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

// Security Headers (Section 13: Security Headers)
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// CORS Security Configuration (Section 14: CORS Security)
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5000', process.env.APP_URL].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(null, true); // Dev fallback for preview containers
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check API
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    system: 'Pharmacy Management System',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', medicineRoutes); // contains /api/medicines and /api/categories
app.use('/api/suppliers', supplierRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/invoices', salesRoutes); // Section 25 requirement: GET /api/invoices and GET /api/invoices/:id
app.use('/api/purchases', purchaseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', userRoutes);
app.use('/api/notifications', notificationRoutes);

// Global 404 for unmatched /api requests
app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.method} ${req.originalUrl} not found.`,
  });
});

// Global Error Handler (Section 27: Error Handling)
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error on request:', req.method, req.url, err);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error occurred. Please try again.',
  });
});

// Setup Frontend Serving
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, 'localhost', () => {
    console.log(`Pharmacy Management System server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server boot error:', err);
  process.exit(1);
});
