import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/authRoutes.js';
import postRoutes from './routes/postRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import { notFoundHandler, errorHandler } from './middleware/errorMiddleware.js';

const app = express();

// Security HTTP headers
app.use(helmet());

// CORS configuration
const allowedOrigin = process.env.CLIENT_URL || '*';
app.use(
  cors({
    origin: allowedOrigin === '*' ? '*' : allowedOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Global request rate limiting
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 200,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    errors: [{ message: 'Global rate limit exceeded' }],
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(generalLimiter);

// Body parsers with safe payload size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: "Akatsuki's Draft API is healthy and operational",
    timestamp: new Date().toISOString(),
  });
});

// Root welcome endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to Akatsuki's Draft - AI-Enabled Content Sharing Platform API",
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      posts: '/api/posts',
      admin: '/api/admin',
      ai: '/api/ai',
      health: '/health',
    },
  });
});

// Mount application API routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);

// Unmatched routes 404 handler
app.use(notFoundHandler);

// Centralized error handling middleware
app.use(errorHandler);

export default app;
