import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import os from 'os';
import connectDB from './configs/db.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import bannerRoutes from './routes/bannerRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import productRoutes from './routes/productRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import orderRoutes from './routes/orderRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Validate critical security environment variables
if (!process.env.JWT_SECRET) {
  console.error('[SECURITY FATAL]: JWT_SECRET environment variable is missing. Server cannot start securely without a configured JWT secret.');
  process.exit(1);
}

// Global Middlewares
app.use(cors({
  origin: true, // Allow frontend, mobile, and admin origins
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Normalize request URL if rewritten by serverless proxy
app.use((req, res, next) => {
  if (req.url === '/server.js' || req.url.startsWith('/server.js')) {
    const rawPath = req.headers['x-matched-path'] || req.headers['x-forwarded-uri'] || '/';
    if (rawPath && rawPath !== '/server.js') {
      req.url = rawPath;
    }
  }
  next();
});

// Serve uploaded files statically (use /tmp in serverless/Vercel)
const isServerless = Boolean(
  process.env.VERCEL || 
  process.env.AWS_LAMBDA_FUNCTION_NAME || 
  process.env.LAMBDA_TASK_ROOT
);
const uploadStaticDir = isServerless
  ? path.join(os.tmpdir(), 'uploads')
  : path.join(process.cwd(), 'uploads');

app.use('/uploads', express.static(uploadStaticDir));


// Request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'The Lens Hut API server is active and healthy',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/banners', bannerRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/wishlist', wishlistRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/orders', orderRoutes);


// 404 Fallback Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot find route ${req.method} ${req.originalUrl} on this server`,
    errorCode: 'ROUTE_NOT_FOUND',
  });
});

// Global Centralized Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]:', err);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    errorCode: err.errorCode || 'INTERNAL_SERVER_ERROR',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// Start HTTP Server (Only listen when running directly, not inside Vercel serverless environment)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`  The Lens Hut Backend Server running on port ${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  API Base URL: http://localhost:${PORT}/api/v1`);
    console.log(`======================================================\n`);
  });
}

export default app;
