/**
 * EXPRESS SERVER APPLICATION ENTRYPOINT
 * Community Multisports Booking Portal (Jito Sports Series 2026-2027)
 */

const path = require('path');
const express = require('express');
const config = require('./config/env');
const db = require('./database/db');
const { runMigrations } = require('./database/migrator');

const authRoutes = require('./routes/authRoutes');
const playerRoutes = require('./routes/playerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const eventRoutes = require('./routes/eventRoutes');
const bookingRoutes = require('./routes/bookingRoutes');

const app = express();

// Standard Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS headers for prototype & cross-origin API integration
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-access-token');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Serve Public Frontend Website
const publicDir = path.resolve(__dirname, '../');
app.use(express.static(publicDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);

// Health & System Info
app.get('/api/health', async (req, res) => {
  try {
    const dbTest = await db.get('SELECT 1 as healthy');
    res.json({
      status: 'HEALTHY',
      service: 'Community Multisports Booking Engine',
      environment: config.nodeEnv,
      timestamp: new Date().toISOString(),
      database: dbTest ? 'CONNECTED' : 'DISCONNECTED'
    });
  } catch (err) {
    res.status(503).json({
      status: 'UNHEALTHY',
      error: err.message
    });
  }
});

// Global 404 for unmatched API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.originalUrl}` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error'
  });
});

async function startServer(port = config.port) {
  // Ensure database migrations are current
  await runMigrations();

  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`\n================================================================`);
      console.log(` COMMUNITY MULTISPORTS SERVER IS ACTIVE`);
      console.log(` Port: ${port} | Environment: ${config.nodeEnv}`);
      console.log(` Local URL: http://localhost:${port}`);
      console.log(` API Health: http://localhost:${port}/api/health`);
      console.log(`================================================================\n`);
      resolve(server);
    });
  });
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error('[FATAL SERVER START ERROR]', err);
    process.exit(1);
  });
}

module.exports = { app, startServer };
