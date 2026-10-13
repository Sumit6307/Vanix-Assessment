/**
 * Vanix IoT Backend Server
 * Main entry point
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize database
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'vanix.db');
initDB(dbPath);
console.log(`[DB] Initialized at ${dbPath}`);

// Routes
app.use('/api/ingest', require('./routes/ingest'));
app.use('/api/devices', require('./routes/devices'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/notifications', require('./routes/notifications'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Root Index
app.get('/api', (req, res) => {
  res.json({
    name: 'Vanix Sentinel IoT Telemetry Backend',
    version: '1.0.0',
    status: 'online',
    endpoints: {
      health: 'GET /api/health',
      devices: 'GET /api/devices',
      deviceDetails: 'GET /api/devices/:id',
      deviceReadings: 'GET /api/devices/:id/readings',
      alerts: 'GET /api/alerts',
      acknowledgeAlert: 'PATCH /api/alerts/:id (or POST /api/alerts/:id/ack)',
      ingest: 'POST /api/ingest',
      auth: 'POST /api/auth/login, GET /api/auth/me (Bonus)',
      notifications: 'GET /api/notifications (Bonus Push Notifications)'
    }
  });
});

// Serve mobile app bundle if built
const fs = require('fs');
const mobileDistPath = path.join(__dirname, '..', '..', 'mobile', 'dist');
if (fs.existsSync(mobileDistPath)) {
  app.use(express.static(mobileDistPath));
  app.use('/app', express.static(mobileDistPath));
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[SERVER] Vanix IoT Backend running on port ${PORT}`);
  console.log(`[SERVER] API base URL: http://localhost:${PORT}/api`);
});

module.exports = app;
