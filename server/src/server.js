import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './routes/api.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initDatabase } from './db/init.js';
import { startHoldWorker, stopHoldWorker } from './services/holdWorker.js';

import db from './db/connection.js';
import { seedDatabase } from './db/seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: '*',
    credentials: true
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize DB tables asynchronously
await initDatabase();

// Auto-seed demo catalogue if empty
try {
  const eventRes = await db.get('SELECT COUNT(*)::int as count FROM events');
  const eventCount = eventRes ? eventRes.count : 0;
  if (eventCount === 0) {
    console.log('Database empty. Automatically populating initial seed dataset...');
    await seedDatabase();
  }
} catch (err) {
  console.error('Auto-seed error:', err);
}

// Start Background Hold TTL & Waitlist Cascade Worker (runs every 3 seconds)
startHoldWorker(3000);

// API Routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Ticket Booking Platform API',
    concurrency_engine: 'Supabase PostgreSQL Cloud DB',
    worker: 'Active'
  });
});

// Centralized error handler
app.use(errorHandler);

// Start HTTP Server
const server = app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Ticket Booking API Server running on port ${PORT}`);
  console.log(`📡 Health Check: http://localhost:${PORT}/health`);
  console.log(`⚡ Concurrency Engine: Supabase PostgreSQL Active`);
  console.log(`⏳ Hold TTL & Waitlist Cascade Worker: Running`);
  console.log(`======================================================\n`);
});

// Graceful Shutdown
function handleShutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  stopHoldWorker();
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

export default app;
