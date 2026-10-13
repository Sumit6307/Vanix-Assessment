/**
 * Alert Service
 * Handles alert rule evaluation and management
 * 
 * Alert types:
 * 1. over_temperature: temperature > 40.00 °C
 * 2. offline: no packets from device for 30 minutes
 * 3. inactive: average activity score over last 1 hour < threshold
 * 
 * Inactive threshold choice: 5.0
 * Rationale: A device at rest shows magnitude ≈ 1000 milli-g (1g gravity).
 * Sensor noise typically produces magnitudes around 990-1010, giving |mag - 1000| ≈ 0-10.
 * A threshold of 5.0 means the average deviation from 1g is less than 5 milli-g,
 * indicating the device has essentially stopped moving. Devices that are vibrating,
 * being transported, or experiencing any real motion will exceed this easily.
 * This was validated against the SN-70004 device in the sample data which shows
 * very low activity scores (consistently near 1000 milli-g readings).
 */

const { getDB } = require('../db');

const INACTIVE_THRESHOLD = 5.0;
const OFFLINE_MINUTES = 30;
const OVETEMP_CELSIUS = 40.00;

/**
 * Check and raise alerts for a decoded packet
 * Uses packet timestamp (not server clock) for all time-based rules
 * Does not raise duplicate open alerts for the same device+type
 * 
 * @param {Object} decoded - The decoded packet
 * @param {number} decoded.deviceId
 * @param {number} decoded.temperature
 * @param {number} decoded.timestamp - Unix seconds from device clock
 * @param {number} decoded.activityScore
 */
function checkAlerts(decoded) {
  const db = getDB();

  // 1. Over-temperature alert: temperature > 40.00 °C
  if (decoded.temperature > OVETEMP_CELSIUS) {
    raiseAlertIfNew(db, {
      type: 'over_temperature',
      deviceId: decoded.deviceId,
      timeRaised: new Date(decoded.timestamp * 1000).toISOString(),
      message: `Temperature ${decoded.temperature.toFixed(2)}°C exceeds threshold of ${OVETEMP_CELSIUS}°C`
    });
  }

  // 2. Inactive alert: check average activity score over last hour
  checkInactiveAlert(db, decoded);
}

/**
 * Check if a device has become inactive (low average activity over 1 hour)
 */
function checkInactiveAlert(db, decoded) {
  const oneHourAgo = decoded.timestamp - 3600; // 1 hour before this packet's timestamp

  const result = db.prepare(`
    SELECT AVG(activity_score) as avg_score, COUNT(*) as count
    FROM readings
    WHERE device_id = ? AND timestamp >= ? AND timestamp <= ?
  `).get(decoded.deviceId, oneHourAgo, decoded.timestamp);

  // Need at least 4 readings (1 minute worth) to make a judgement
  if (result && result.count >= 4 && result.avg_score !== null && result.avg_score < INACTIVE_THRESHOLD) {
    raiseAlertIfNew(db, {
      type: 'inactive',
      deviceId: decoded.deviceId,
      timeRaised: new Date(decoded.timestamp * 1000).toISOString(),
      message: `Average activity score ${result.avg_score.toFixed(2)} is below threshold of ${INACTIVE_THRESHOLD} over the last hour`
    });
  }
}

/**
 * Check all devices for offline status
 * Should be called periodically (e.g., every minute)
 * A device is offline if no packets received for 30 minutes
 * Uses the latest packet timestamp as reference
 * 
 * @param {number} [referenceTimestamp] - Unix seconds to use as "now". If not provided, uses the latest packet timestamp.
 */
function checkOfflineAlerts(referenceTimestamp) {
  const db = getDB();

  // Get the reference time: either provided or the latest packet timestamp
  let refTime = referenceTimestamp;
  if (!refTime) {
    const latest = db.prepare('SELECT MAX(timestamp) as max_ts FROM readings').get();
    if (!latest || !latest.max_ts) return; // No readings yet
    refTime = latest.max_ts;
  }

  const offlineThreshold = refTime - (OFFLINE_MINUTES * 60);

  // Find all devices that have at least one reading but none within the threshold
  const offlineDevices = db.prepare(`
    SELECT device_id, MAX(timestamp) as last_seen
    FROM readings
    GROUP BY device_id
    HAVING MAX(timestamp) < ?
  `).all(offlineThreshold);

  for (const device of offlineDevices) {
    const lastSeenDate = new Date(device.last_seen * 1000).toISOString();
    const minutesAgo = Math.round((refTime - device.last_seen) / 60);
    raiseAlertIfNew(db, {
      type: 'offline',
      deviceId: device.device_id,
      timeRaised: new Date(refTime * 1000).toISOString(),
      message: `Device has not sent data for ${minutesAgo} minutes (last seen: ${lastSeenDate})`
    });
  }
}

/**
 * Raise an alert only if there isn't already an open (unacknowledged) alert
 * of the same type for the same device
 */
function raiseAlertIfNew(db, alert) {
  const existing = db.prepare(`
    SELECT id FROM alerts
    WHERE device_id = ? AND type = ? AND acknowledged = 0
  `).get(alert.deviceId, alert.type);

  if (!existing) {
    db.prepare(`
      INSERT INTO alerts (type, device_id, message, time_raised)
      VALUES (?, ?, ?, ?)
    `).run(alert.type, alert.deviceId, alert.message, alert.timeRaised);

    console.log(`[ALERT] ${alert.type} raised for device ${alert.deviceId}: ${alert.message}`);

    // Bonus Feature: Push notification dispatch for over-temperature
    if (alert.type === 'over_temperature') {
      try {
        const { sendPushNotification } = require('./notifications');
        sendPushNotification({
          type: 'over_temperature',
          deviceId: alert.deviceId,
          title: `🔥 CRITICAL OVER-TEMPERATURE: Device ${alert.deviceId}`,
          body: alert.message,
          priority: 'critical'
        });
      } catch (e) {}
    }
  }
}

/**
 * Acknowledge an alert by ID
 * @param {number} alertId
 * @returns {Object|null} The updated alert or null if not found
 */
function acknowledgeAlert(alertId) {
  const db = getDB();

  const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(alertId);
  if (!alert) return null;

  if (alert.acknowledged) {
    return alert; // Already acknowledged
  }

  db.prepare(`
    UPDATE alerts SET acknowledged = 1, acknowledged_at = datetime('now')
    WHERE id = ?
  `).run(alertId);

  return db.prepare('SELECT * FROM alerts WHERE id = ?').get(alertId);
}

/**
 * Get alerts with optional status filter
 * @param {Object} options
 * @param {string} [options.status] - 'open' or 'acknowledged'
 * @returns {Array}
 */
function getAlerts(options = {}) {
  const db = getDB();

  let query = 'SELECT * FROM alerts';
  const params = [];

  if (options.status === 'open') {
    query += ' WHERE acknowledged = 0';
  } else if (options.status === 'acknowledged') {
    query += ' WHERE acknowledged = 1';
  }

  query += ' ORDER BY created_at DESC';

  return db.prepare(query).all(params);
}

module.exports = {
  checkAlerts,
  checkOfflineAlerts,
  acknowledgeAlert,
  getAlerts,
  INACTIVE_THRESHOLD,
  OFFLINE_MINUTES,
  OVETEMP_CELSIUS
};
