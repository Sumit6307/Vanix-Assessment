/**
 * Alerts API Routes
 * List and acknowledge alerts
 */

const express = require('express');
const router = express.Router();
const { getAlerts, acknowledgeAlert } = require('../services/alerts');

/**
 * GET /api/alerts
 * List alerts with optional status filter
 * Query params: status ('open' or 'acknowledged')
 */
router.get('/', (req, res) => {
  try {
    const status = req.query.status;
    
    if (status && !['open', 'acknowledged'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        details: 'Status must be "open" or "acknowledged"'
      });
    }

    const alerts = getAlerts({ status });

    const formatted = alerts.map(a => ({
      id: a.id,
      type: a.type,
      deviceId: a.device_id,
      message: a.message,
      timeRaised: a.time_raised,
      acknowledged: !!a.acknowledged,
      acknowledgedAt: a.acknowledged_at,
      createdAt: a.created_at
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    console.error('[ALERTS ERROR]', error.message);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

/**
 * PATCH /api/alerts/:id
 * Acknowledge an alert
 */
router.patch('/:id', (req, res) => {
  try {
    const alertId = parseInt(req.params.id, 10);
    
    if (isNaN(alertId)) {
      return res.status(400).json({ error: 'Invalid alert ID' });
    }

    const alert = acknowledgeAlert(alertId);
    
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    return res.status(200).json({
      id: alert.id,
      type: alert.type,
      deviceId: alert.device_id,
      message: alert.message,
      timeRaised: alert.time_raised,
      acknowledged: !!alert.acknowledged,
      acknowledgedAt: alert.acknowledged_at
    });
  } catch (error) {
    console.error('[ALERTS ERROR]', error.message);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

module.exports = router;
