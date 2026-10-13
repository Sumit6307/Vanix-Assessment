/**
 * Devices API Routes
 * CRUD operations for device management and reading retrieval
 */

const express = require('express');
const router = express.Router();
const { getDB } = require('../db');

/**
 * POST /api/devices
 * Register a new device
 * Body: { deviceId, label, location?, installDate? }
 */
router.post('/', (req, res) => {
  try {
    const { deviceId, label, location, installDate } = req.body;

    if (!deviceId || !label) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'deviceId and label are required'
      });
    }

    const db = getDB();

    // Check if device already exists
    const existing = db.prepare('SELECT * FROM devices WHERE device_id = ?').get(deviceId);
    if (existing) {
      // Update the existing device
      db.prepare(`
        UPDATE devices SET label = ?, location = ?, install_date = ?
        WHERE device_id = ?
      `).run(label, location || existing.location, installDate || existing.install_date, deviceId);

      const updated = db.prepare('SELECT * FROM devices WHERE device_id = ?').get(deviceId);
      return res.status(200).json(updated);
    }

    db.prepare(`
      INSERT INTO devices (device_id, label, location, install_date)
      VALUES (?, ?, ?, ?)
    `).run(deviceId, label, location || '', installDate || new Date().toISOString());

    const device = db.prepare('SELECT * FROM devices WHERE device_id = ?').get(deviceId);
    return res.status(201).json(device);
  } catch (error) {
    console.error('[DEVICES ERROR]', error.message);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

/**
 * GET /api/devices
 * List all devices with latest temperature, activity score, last-seen time, and alert count
 */
router.get('/', (req, res) => {
  try {
    const db = getDB();

    const devices = db.prepare(`
      SELECT 
        d.*,
        r.temperature as latest_temperature,
        r.battery as latest_battery,
        r.activity_score as latest_activity_score,
        r.timestamp as last_seen_timestamp,
        r.label as reading_label,
        (SELECT COUNT(*) FROM readings r3 WHERE r3.device_id = d.device_id) as packet_count,
        (SELECT COUNT(*) FROM alerts a WHERE a.device_id = d.device_id AND a.acknowledged = 0) as open_alerts
      FROM devices d
      LEFT JOIN readings r ON r.device_id = d.device_id 
        AND r.timestamp = (SELECT MAX(r2.timestamp) FROM readings r2 WHERE r2.device_id = d.device_id)
      ORDER BY d.device_id
    `).all();

    // Format the response
    const formatted = devices.map(device => ({
      id: device.id,
      deviceId: device.device_id,
      label: device.label || device.reading_label || `Device-${device.device_id}`,
      location: device.location,
      installDate: device.install_date,
      latestTemperature: device.latest_temperature,
      latestBattery: device.latest_battery,
      latestActivityScore: device.latest_activity_score,
      lastSeenTimestamp: device.last_seen_timestamp,
      lastSeenTime: device.last_seen_timestamp ? new Date(device.last_seen_timestamp * 1000).toISOString() : null,
      packetCount: device.packet_count || 0,
      openAlerts: device.open_alerts,
      createdAt: device.created_at
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    console.error('[DEVICES ERROR]', error.message);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

/**
 * GET /api/devices/:id
 * Get a single device's details by device_id
 */
router.get('/:id', (req, res) => {
  try {
    const db = getDB();
    const deviceId = parseInt(req.params.id, 10);

    if (isNaN(deviceId)) {
      return res.status(400).json({ error: 'Invalid device ID' });
    }

    const device = db.prepare('SELECT * FROM devices WHERE device_id = ?').get(deviceId);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Get latest reading
    const latestReading = db.prepare(`
      SELECT * FROM readings WHERE device_id = ? ORDER BY timestamp DESC LIMIT 1
    `).get(deviceId);

    // Get open alerts
    const openAlerts = db.prepare(`
      SELECT * FROM alerts WHERE device_id = ? AND acknowledged = 0 ORDER BY created_at DESC
    `).all(deviceId);

    // Get reading count
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_readings,
        MIN(timestamp) as first_seen,
        MAX(timestamp) as last_seen,
        AVG(temperature) as avg_temperature,
        AVG(activity_score) as avg_activity_score
      FROM readings WHERE device_id = ?
    `).get(deviceId);

    return res.status(200).json({
      id: device.id,
      deviceId: device.device_id,
      label: device.label,
      location: device.location,
      installDate: device.install_date,
      createdAt: device.created_at,
      latestReading: latestReading ? {
        sequence: latestReading.sequence_number,
        timestamp: latestReading.timestamp,
        time: new Date(latestReading.timestamp * 1000).toISOString(),
        temperature: latestReading.temperature,
        battery: latestReading.battery,
        activityScore: latestReading.activity_score,
        samples: JSON.parse(latestReading.samples)
      } : null,
      openAlerts,
      stats: stats ? {
        totalReadings: stats.total_readings,
        firstSeen: stats.first_seen ? new Date(stats.first_seen * 1000).toISOString() : null,
        lastSeen: stats.last_seen ? new Date(stats.last_seen * 1000).toISOString() : null,
        avgTemperature: stats.avg_temperature ? Math.round(stats.avg_temperature * 100) / 100 : null,
        avgActivityScore: stats.avg_activity_score ? Math.round(stats.avg_activity_score * 100) / 100 : null
      } : null
    });
  } catch (error) {
    console.error('[DEVICES ERROR]', error.message);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

/**
 * GET /api/devices/:id/readings
 * Get readings for a device in a time range, newest first, paginated
 * Query params: from (unix timestamp), to (unix timestamp), page, limit
 */
router.get('/:id/readings', (req, res) => {
  try {
    const db = getDB();
    const deviceId = parseInt(req.params.id, 10);

    if (isNaN(deviceId)) {
      return res.status(400).json({ error: 'Invalid device ID' });
    }

    const from = req.query.from ? parseInt(req.query.from, 10) : 0;
    const to = req.query.to ? parseInt(req.query.to, 10) : Math.floor(Date.now() / 1000) + 86400;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = db.prepare(`
      SELECT COUNT(*) as total FROM readings
      WHERE device_id = ? AND timestamp >= ? AND timestamp <= ?
    `).get(deviceId, from, to);

    // Get paginated readings
    const readings = db.prepare(`
      SELECT * FROM readings
      WHERE device_id = ? AND timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `).all(deviceId, from, to, limit, offset);

    const formatted = readings.map(r => ({
      id: r.id,
      deviceId: r.device_id,
      sequence: r.sequence_number,
      timestamp: r.timestamp,
      time: new Date(r.timestamp * 1000).toISOString(),
      temperature: r.temperature,
      battery: r.battery,
      activityScore: r.activity_score,
      samples: JSON.parse(r.samples),
      label: r.label
    }));

    return res.status(200).json({
      data: formatted,
      pagination: {
        page,
        limit,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    console.error('[READINGS ERROR]', error.message);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

module.exports = router;
