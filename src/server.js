import dotenv from 'dotenv';
// Load environment variables before anything else
dotenv.config();

import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';

const PORT = process.env.PORT || 5000;

// Security check: ensure critical secrets are set in production
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  console.error('[FATAL SECURITY ERROR] In production, JWT_SECRET must be configured and at least 32 characters long.');
  process.exit(1);
}

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(` Akatsuki's Draft API Server running`);
      console.log(` Port:        http://localhost:${PORT}`);
      console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(` AI Provider: ${process.env.AI_PROVIDER || 'gemini'}`);
      console.log(`=======================================================`);
    });

    // Graceful shutdown handling
    const shutdown = async (signal) => {
      console.log(`\n[Process] Received ${signal}. Starting graceful shutdown...`);
      server.close(async () => {
        console.log('[Process] HTTP server closed');
        await disconnectDB();
        process.exit(0);
      });

      // Force close if graceful shutdown takes too long
      setTimeout(() => {
        console.error('[Process] Forcing shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    process.on('unhandledRejection', (reason, promise) => {
      console.error('[Unhandled Rejection] at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      console.error('[Uncaught Exception]:', error);
      shutdown('uncaughtException');
    });
  } catch (error) {
    console.error(`[Server Start Error] Failed to launch server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
