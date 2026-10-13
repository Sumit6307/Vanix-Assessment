/**
 * Ingest Service
 * Handles the full pipeline: receive → store raw → decrypt → store plaintext → decode → store reading → check alerts
 * Also handles duplicate detection based on device ID + sequence number within 2 minutes.
 */

const { getDB } = require('../db');
const { decryptPacket } = require('./decryption');
const { decodePacket, computeActivityScore } = require('./decoder');
const { checkAlerts, checkOfflineAlerts } = require('./alerts');

/**
 * Process an incoming encrypted packet through the full pipeline
 * 
 * @param {Object} body - The encrypted packet body from the gateway
 * @param {string} body.gatewayId - Gateway identifier
 * @param {string} body.iv - Base64-encoded IV
 * @param {string} body.ciphertext - Base64-encoded ciphertext
 * @param {string} body.tag - Base64-encoded GCM auth tag
 * @returns {Object} Result with decoded data and metadata
 */
function ingestPacket(body) {
  const db = getDB();

  // Step 1: Store the raw encrypted packet
  const encResult = db.prepare(`
    INSERT INTO encrypted_packets (gateway_id, iv, ciphertext, tag, received_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `).run(body.gatewayId || 'unknown', body.iv, body.ciphertext, body.tag);

  const encryptedPacketId = encResult.lastInsertRowid;

  // Step 2: Decrypt the packet
  const { plaintext, parsed } = decryptPacket(body);

  // Step 3: Store the decrypted plaintext
  db.prepare(`
    INSERT INTO decrypted_packets (encrypted_packet_id, plaintext)
    VALUES (?, ?)
  `).run(encryptedPacketId, plaintext);

  // Step 4: Decode the packet
  const data = parsed.data;
  const decoded = decodePacket(data);

  // Step 5: Check for duplicates
  // A packet with the same device ID and sequence number within 2 minutes is a duplicate
  const isDuplicate = checkDuplicate(db, decoded);

  if (isDuplicate) {
    return {
      status: 'duplicate',
      encryptedPacketId,
      decoded,
      message: 'Duplicate packet detected - reading not stored again'
    };
  }

  // Step 6: Compute activity score
  const activityScore = computeActivityScore(decoded.samples);
  decoded.activityScore = activityScore;

  // Step 7: Store the reading
  const readingResult = db.prepare(`
    INSERT INTO readings (device_id, sequence_number, timestamp, temperature, battery, label, samples, activity_score, encrypted_packet_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    decoded.deviceId,
    decoded.sequence,
    decoded.timestamp,
    decoded.temperature,
    decoded.battery,
    decoded.label,
    JSON.stringify(decoded.samples),
    activityScore,
    encryptedPacketId
  );

  // Step 8: Auto-register device if not already registered
  autoRegisterDevice(db, decoded);

  // Step 9: Check alert rules
  checkAlerts(decoded);

  // Step 10: Check for offline devices (using current packet's timestamp as reference)
  checkOfflineAlerts(decoded.timestamp);

  return {
    status: 'ok',
    encryptedPacketId,
    readingId: readingResult.lastInsertRowid,
    decoded: {
      deviceId: decoded.deviceId,
      sequence: decoded.sequence,
      timestamp: decoded.timestamp,
      temperature: decoded.temperature,
      battery: decoded.battery,
      label: decoded.label,
      activityScore
    }
  };
}

/**
 * Check if a packet is a duplicate
 * Duplicate = same device ID + sequence number within 2 minutes
 * The sequence number wraps from 255 to 0, so we just compare exact values
 * 
 * @param {Database} db
 * @param {Object} decoded
 * @returns {boolean}
 */
function checkDuplicate(db, decoded) {
  const twoMinutesAgo = decoded.timestamp - 120;

  const existing = db.prepare(`
    SELECT id FROM readings
    WHERE device_id = ? AND sequence_number = ? AND timestamp >= ?
    LIMIT 1
  `).get(decoded.deviceId, decoded.sequence, twoMinutesAgo);

  return !!existing;
}

/**
 * Auto-register a device if it's not already in the devices table
 * Packets from unregistered devices are still stored (readings table has no FK constraint on devices)
 */
function autoRegisterDevice(db, decoded) {
  const existing = db.prepare('SELECT id FROM devices WHERE device_id = ?').get(decoded.deviceId);
  if (!existing) {
    db.prepare(`
      INSERT INTO devices (device_id, label, location, install_date)
      VALUES (?, ?, 'Auto-registered', datetime('now'))
    `).run(decoded.deviceId, decoded.label);
    console.log(`[DEVICE] Auto-registered device ${decoded.deviceId} (${decoded.label})`);
  }
}

module.exports = { ingestPacket };
