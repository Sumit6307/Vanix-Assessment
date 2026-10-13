/**
 * Database Schema Migration
 * Creates all tables for the Vanix IoT Backend
 * 
 * Design decisions:
 * - Motion samples stored as JSON array in the readings table. This simplifies queries
 *   for the mobile app (single row fetch) and avoids a separate join table. For 16 samples
 *   of 3 axes, a separate table would add complexity without meaningful query benefits
 *   since we always read all 16 samples together.
 * - Raw packets stored in two tables (encrypted + decrypted) mirroring the sample database
 *   structure for consistency and auditability.
 * - Indexes on device_id and timestamp for efficient range queries and duplicate detection.
 */

const SCHEMA_SQL = `
-- ============================================
-- RAW PACKET STORAGE (mirrors sample database)
-- ============================================

CREATE TABLE IF NOT EXISTS encrypted_packets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gateway_id TEXT NOT NULL,
  iv TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  tag TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS decrypted_packets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  encrypted_packet_id INTEGER NOT NULL REFERENCES encrypted_packets(id),
  plaintext TEXT NOT NULL
);

-- ============================================
-- DEVICES
-- ============================================

CREATE TABLE IF NOT EXISTS devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL UNIQUE,
  label TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  install_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================
-- READINGS (one per unique packet)
-- ============================================

CREATE TABLE IF NOT EXISTS readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL,
  sequence_number INTEGER NOT NULL,
  timestamp INTEGER NOT NULL,
  temperature REAL NOT NULL,
  battery INTEGER NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  samples TEXT NOT NULL DEFAULT '[]',
  activity_score REAL NOT NULL DEFAULT 0,
  encrypted_packet_id INTEGER REFERENCES encrypted_packets(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for duplicate detection: device_id + sequence_number + timestamp
CREATE INDEX IF NOT EXISTS idx_readings_dedup 
  ON readings(device_id, sequence_number, timestamp);

-- Index for time-range queries
CREATE INDEX IF NOT EXISTS idx_readings_device_time 
  ON readings(device_id, timestamp DESC);

-- Index for latest reading per device
CREATE INDEX IF NOT EXISTS idx_readings_timestamp 
  ON readings(timestamp DESC);

-- ============================================
-- ALERTS
-- ============================================

CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('over_temperature', 'offline', 'inactive')),
  device_id INTEGER NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  time_raised TEXT NOT NULL,
  acknowledged INTEGER NOT NULL DEFAULT 0,
  acknowledged_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_alerts_device 
  ON alerts(device_id, type, acknowledged);

CREATE INDEX IF NOT EXISTS idx_alerts_status 
  ON alerts(acknowledged, created_at DESC);
`;

module.exports = { SCHEMA_SQL };
