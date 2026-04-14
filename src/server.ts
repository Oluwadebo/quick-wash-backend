import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/authRoutes';
import orderRoutes from './routes/orderRoutes';
import vendorRoutes from './routes/vendorRoutes';
import riderRoutes from './routes/riderRoutes';
import walletRoutes from './routes/walletRoutes';
import adminRoutes from './routes/adminRoutes';
import paymentRoutes from './routes/paymentRoutes';
import { initCronJobs } from './utils/cron';

// Load env vars
dotenv.config();

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/riders', riderRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);

// Error Handler
import { errorHandler } from './middleware/errorHandler';
app.use(errorHandler);

// Basic Route
app.get('/', (req, res) => {
  res.json({ message: 'Quick-Wash API is running' });
});

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quickwash';

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    initCronJobs();
  })
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// Start Server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

export default app;
