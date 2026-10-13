-- ============================================================================
-- Vanix IoT Assessment - Database Schema
-- Compatible with SQLite3 and easily adapted to PostgreSQL / MySQL
-- ============================================================================

-- ============================================================================
-- 1. RAW PACKET STORAGE (Audit trail mirroring sample database)
-- ============================================================================

-- Stores every encrypted packet exactly as received from the field gateway
CREATE TABLE IF NOT EXISTS encrypted_packets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gateway_id TEXT NOT NULL,
  iv TEXT NOT NULL,               -- 12-byte nonce, base64 encoded
  ciphertext TEXT NOT NULL,       -- AES-256-GCM ciphertext, base64 encoded
  tag TEXT NOT NULL,              -- 16-byte GCM auth tag, base64 encoded
  received_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Stores decrypted UTF-8 JSON plaintext linked directly to encrypted packet
CREATE TABLE IF NOT EXISTS decrypted_packets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  encrypted_packet_id INTEGER NOT NULL REFERENCES encrypted_packets(id) ON DELETE CASCADE,
  plaintext TEXT NOT NULL         -- Decrypted JSON string: {"data": [256 numbers]}
);

-- ============================================================================
-- 2. DEVICES
-- ============================================================================

-- Metadata and registry for field devices
CREATE TABLE IF NOT EXISTS devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL UNIQUE, -- 32-bit unsigned integer (e.g. 70002)
  label TEXT NOT NULL DEFAULT '',    -- Human-readable label (e.g. SN-70002)
  location TEXT NOT NULL DEFAULT '', -- Physical location / installation site
  install_date TEXT,                 -- ISO timestamp of installation
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id);

-- ============================================================================
-- 3. READINGS (One row per unique packet)
-- ============================================================================

-- Stores parsed telemetry and computed motion metrics.
-- MOTION SAMPLES DESIGN DECISION:
-- The 16 motion samples (each with X, Y, Z in milli-g) are stored as a JSON array
-- in the 'samples' column.
-- RATIONALE:
-- 1. Query Pattern: High frequency queries retrieve all 16 samples for a reading together
--    to graph the waveform or compute FFT / activity. We never query for sample #7 in isolation.
-- 2. Performance: Avoids a 16x row explosion (1,500 packets = 24,000 extra rows) and eliminates
--    costly table joins on every fetch.
-- 3. Atomicity & Simplicity: Mobile API endpoints receive the full reading in a single fast row lookup.
CREATE TABLE IF NOT EXISTS readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL,
  sequence_number INTEGER NOT NULL,  -- uint8 sequence counter (0..255, wraps)
  timestamp INTEGER NOT NULL,        -- Unix timestamp from device clock (seconds)
  temperature REAL NOT NULL,         -- Decimal °C (e.g. -6.78, 42.15)
  battery INTEGER NOT NULL,          -- Battery percentage (0..100)
  label TEXT NOT NULL DEFAULT '',    -- Device label from packet header
  samples TEXT NOT NULL DEFAULT '[]',-- JSON array of 16 {x, y, z} motion objects
  activity_score REAL NOT NULL DEFAULT 0, -- Average deviation from 1000 milli-g
  encrypted_packet_id INTEGER REFERENCES encrypted_packets(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for duplicate packet detection (device + sequence + timestamp)
CREATE INDEX IF NOT EXISTS idx_readings_dedup 
  ON readings(device_id, sequence_number, timestamp);

-- Index for time-range queries on device telemetry (newest first)
CREATE INDEX IF NOT EXISTS idx_readings_device_time 
  ON readings(device_id, timestamp DESC);

-- Index for global latest readings
CREATE INDEX IF NOT EXISTS idx_readings_timestamp 
  ON readings(timestamp DESC);

-- ============================================================================
-- 4. ALERTS
-- ============================================================================

-- Stores operational alarms: over_temperature (>40°C), offline (>30m), inactive (<5.0)
CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('over_temperature', 'offline', 'inactive')),
  device_id INTEGER NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  time_raised TEXT NOT NULL,         -- ISO 8601 string based on device clock
  acknowledged INTEGER NOT NULL DEFAULT 0, -- 0 = open, 1 = acknowledged
  acknowledged_at TEXT,              -- Timestamp when user acknowledged
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for open alert queries per device (prevents duplicate open alerts)
CREATE INDEX IF NOT EXISTS idx_alerts_device 
  ON alerts(device_id, type, acknowledged);

-- Index for active alerts list sorted by creation
CREATE INDEX IF NOT EXISTS idx_alerts_status 
  ON alerts(acknowledged, created_at DESC);
