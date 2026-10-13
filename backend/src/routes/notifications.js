/**
 * Notifications API Route (Bonus Task)
 * Exposes push notifications for mobile app consumption
 */

const express = require('express');
const router = express.Router();
const { getRecentNotifications } = require('../services/notifications');

/**
 * GET /api/notifications
 * Returns list of recent push notifications (over-temperature alerts, etc.)
 */
router.get('/', (req, res) => {
  const notifications = getRecentNotifications();
  return res.status(200).json(notifications);
});

module.exports = router;
