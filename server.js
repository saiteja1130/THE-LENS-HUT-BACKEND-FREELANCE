import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
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

// Global Middlewares
app.use(cors({
  origin: true, // Allow frontend, mobile, and admin origins
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));


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

// Start HTTP Server
const server = app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  The Lens Hut Backend Server running on port ${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  API Base URL: http://localhost:${PORT}/api/v1`);
  console.log(`======================================================\n`);
});

export default app;
