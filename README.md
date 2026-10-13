# Vanix IoT Telemetry & Alert Sentinel

An enterprise-grade, end-to-end IoT ingestion backend and responsive mobile telemetry application. It securely ingests AES-256-GCM encrypted field packets, decrypts and parses 256-byte binary sensor telemetry, detects duplicate forwardings, evaluates real-time alert rules, stores time-series readings, and serves a high-performance REST API to a mobile monitoring application.

---

## 📑 Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Quick Start & Setup](#quick-start--setup)
3. [Running Tests](#running-tests)
4. [Sample Dataset Analysis & Findings](#sample-dataset-analysis--findings)
5. [Database Schema & Data Modeling](#database-schema--data-modeling)
6. [REST API Documentation](#rest-api-documentation)
7. [Replay Script Guide](#replay-script-guide)
8. [Mobile Application](#mobile-application)
9. [High-Scale Architecture Note (50,000 Devices)](#high-scale-architecture-note-50000-devices)
10. [Bonus Features](#bonus-features)
11. [Assumptions & Design Decisions](#assumptions--design-decisions)
12. [What I Would Improve With More Time](#-what-i-would-improve-with-more-time)

---

## 🏛 Architecture Overview

```
[ Field Device ]
   │ (Measures Temp & 16x 3-Axis Accelerometer Samples)
   ▼
[ 256-byte Binary Packet ]
   │
   ▼
[ Gateway GW-01 ] ──► Encrypts with AES-256-GCM (12-byte IV + 16-byte Tag)
   │
   ▼ POST /api/ingest
┌─────────────────────────────────────────────────────────────┐
│                    VANIX BACKEND SERVER                     │
│                                                             │
│  1. Raw Packet Store ──► encrypted_packets                  │
│  2. AES-256-GCM Decrypt ──► decrypted_packets (JSON)        │
│  3. Binary Decoder (Little-endian, Two's Complement, CRC)   │
│  4. Deduplication Engine (2-minute sequence window)        │
│  5. Metric Computation (Vector Activity Score)              │
│  6. Time-Series Store ──► readings & auto-registered devices│
│  7. Rule Engine ──► alerts (Over-Temp, Inactive, Offline)   │
└────────────────────────────────┬────────────────────────────┘
                                 │ REST API (JSON)
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│             MOBILE APPLICATION (React Native / Expo)         │
│                                                             │
│  • Screen 1: Device List Screen                             │
│    - Status badges, temperature chips, relative timestamps   │
│    - Pulsing red alert indicators, pull-to-refresh          │
│                                                             │
│  • Screen 2: Device Detail Screen                           │
│    - SVG 1-hour spline temperature chart + threshold guide   │
│    - Active alert banners + One-tap "Acknowledge" button     │
│    - 3-Axis accelerometer sample visualizer (X, Y, Z mg)     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start & Setup

### Prerequisites
- Node.js v18+ (tested on Node v24)
- npm v9+
- *(Optional)* Docker & Docker Compose

### 1. Local Setup

```bash
# 1. Clone repository
git clone <your-private-repo-url>
cd Vanix-Assessment

# 2. Install backend dependencies
cd backend
npm install

# 3. Configure environment
# Copy .env.example if .env does not exist:
# AES_KEY=04f4848ce46f9384da9b2f915dcb3bd5e9ea218e7e415776d85393391dcbe775
# PORT=3000
# DB_PATH=./data/vanix.db

# 4. Start the backend server
npm start
# Server runs on: http://localhost:3000
# REST API:       http://localhost:3000/api
# Mobile Web App: http://localhost:3000/app/
```

### 2. Docker Compose (One-Command Startup)

```bash
docker-compose up --build
```
This boots the backend container with persistent database volume and automated healthcheck probes on port `3000`.

---

## 🧪 Running Tests

The test suite covers:
- Decryption with AES-256-GCM and authentication tag verification
- Key rotation (fallback to old key during changeover)
- Packet decoding of assignment sample packet 8
- 10+ rows from the sample database (`sample_data.db`)
- Little-endian unsigned & signed (two's complement) conversions
- Checksum verification (sum of bytes 0–251 mod 65536)
- Tampered ciphertext rejection & corrupted byte handling
- Full REST API integration (`/api/ingest`, `/api/devices`, `/api/alerts`)
- Duplicate detection window
- Alert rule evaluations (Over-temp, Inactive, Offline)

Run all tests:
```bash
cd backend
npm test
```

Result: **48 passed out of 48 tests across all test suites (100% passing)**.

---

## 🔍 Sample Dataset Analysis & Findings

Replaying `encrypted_packets.json` (1,574 transmissions over 1 hour from 5 devices) uncovers all key operational scenarios intentionally seeded into the test dataset:

| Device ID | Label | Behavior in Dataset | Triggered Alerts |
| :--- | :--- | :--- | :--- |
| **70001** | `SN-70001` | **Normal Baseline**: Stable temperature around 31.3°C–31.7°C, continuous motion, 97% battery. | None (Nominal) |
| **70002** | `SN-70002` | **Sub-Zero Operation**: Operates consistently below freezing (**-6.78°C to -6.21°C**). Handled via signed two's complement `int16`. | None |
| **70003** | `SN-70003` | **Overheating Device**: Temperature steadily climbs from 31.7°C to **43.47°C**, crossing the 40.0°C threshold at 06:51:16 UTC. | 🚨 `over_temperature` |
| **70004** | `SN-70004` | **Inactive / Stopped Moving**: Vector magnitude deviation drops to **1.43–1.66 mg** (near resting gravity 1000 mg), well below the 5.0 mg threshold. | 🚨 `inactive` |
| **70005** | `SN-70005` | **Device Going Offline**: Stops sending telemetry at **06:19:54 UTC**. After 30 minutes of silence (06:49:54 UTC), an alert is triggered. | 🚨 `offline` |

### Packet Deduplication & Sequence Wrapping
- **Total Encrypted Packets:** 1,574
- **Unique Readings Stored:** 1,041
- **Duplicates Filtered:** 533 (forwarded copies from gateway rejected within the 2-minute sequence window)
- **Sequence Wrapping:** Devices cycle sequence counters from `255` wrap-around back to `0` cleanly.

---

## 💾 Database Schema & Data Modeling

The schema is maintained in `backend/src/db/schema.js` and `backend/schema.sql`:

```sql
-- 1. Raw audit trail
CREATE TABLE encrypted_packets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gateway_id TEXT NOT NULL,
  iv TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  tag TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE decrypted_packets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  encrypted_packet_id INTEGER NOT NULL REFERENCES encrypted_packets(id),
  plaintext TEXT NOT NULL
);

-- 2. Device registry
CREATE TABLE devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL UNIQUE,
  label TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  install_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. Telemetry readings
CREATE TABLE readings (
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

-- 4. Alarms & Alerts
CREATE TABLE alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('over_temperature', 'offline', 'inactive')),
  device_id INTEGER NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  time_raised TEXT NOT NULL,
  acknowledged INTEGER NOT NULL DEFAULT 0,
  acknowledged_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Why Motion Samples are Stored as a JSON Array
Each packet contains 16 motion samples (each with X, Y, Z in milli-g).
1. **Query Pattern:** The application and mobile client always fetch all 16 motion samples together for a reading (e.g. to render waveform charts, calculate FFT, or inspect 3D vector distribution). Individual sample #7 is never queried in isolation.
2. **Performance & Row Explosion:** Storing samples in a normalized child table would generate a 16x row explosion (1,041 readings = 16,656 child rows for just 1 hour). Joining this table on every reading query degrades performance without query benefits.
3. **Atomicity:** Telemetry is written in a single INSERT transaction and served to mobile clients in a single fast indexed row lookup.

---

## 📡 REST API Documentation

Base URL: `http://localhost:3000/api`

| Method | Endpoint | Description | Status Codes |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Server heartbeat & status | `200` |
| `POST` | `/ingest` | Ingest encrypted packet `{ gatewayId, iv, ciphertext, tag }` | `201` (new), `200` (duplicate), `400` (tampered/invalid) |
| `GET` | `/devices` | List all devices with latest temp, battery, activity & alerts | `200` |
| `POST` | `/devices` | Register / update device metadata `{ deviceId, label, location }` | `201`, `200` |
| `GET` | `/devices/:id` | Get single device details, telemetry statistics & latest reading | `200`, `404` |
| `GET` | `/devices/:id/readings` | Get paginated readings in time range `?from=&to=&page=&limit=` | `200` |
| `GET` | `/alerts?status=open` | List alerts (supports `?status=open` or `acknowledged`) | `200` |
| `PATCH`| `/alerts/:id` | Acknowledge an alert by ID | `200`, `404` |

---

## ⏩ Replay Script Guide

The replay script simulates real-time field traffic by streaming `encrypted_packets.json` to `POST /api/ingest`:

```bash
cd backend

# 1. 60x Speed (1 hour of data replays in 1 minute)
npm run replay -- --speed 60

# 2. Maximum Speed (no delays, instant benchmark)
npm run replay -- --speed 0

# 3. Custom target URL or file
node scripts/replay.js --speed 60 --url http://127.0.0.1:3000/api/ingest
```

---

## 📱 Mobile Application

The mobile app is built with **React Native / Expo** in `mobile/` and is **100% responsive** across smartphones (360px+), tablets, and desktop displays.

### Screens & Responsive UI Architecture:
1. **Screen 1: Device List Screen (Fleet Command Center):**
   - **Executive Header:** Live AES-256 stream status, Sentinel IoT badge, quick `Sync Fleet` refresh, and in-app `⚙ API CONFIG` modal.
   - **Inline Over-Temperature Push Alert:** High-visibility critical alert pill (`🔥 OVER-TEMP: SN-70003 (43.5°C) • Inspect →`) placed directly inside the navbar to the left of the Sync Fleet button.
   - **4-Card Executive KPI Telemetry Overview:** Automatically renders as a **balanced 2x2 grid on mobile viewports** (Active Nodes, Incidents, Fleet Climate, Ingested Packets) and expands to 4 columns on desktop.
   - **Horizontal Swipeable Filter Chips:** Filter by `All`, `Alerts`, `Sub-Zero`, `Overheat`, and `Active Motion` in a smooth horizontal scroll container with zero wrapping artifacts.
   - **Interactive Device Cards:** Temperature status tags, live battery gauge bar, motion dev score, relative timestamps, and one-tap deep navigation.
   - Native pull-to-refresh (`RefreshControl`), search filtering, and error retry state.

2. **Screen 2: Device Detail Screen:**
   - **Header & Navigation:** Dedicated `‹ Fleet Command` back navigation and `#NODE` identifier.
   - **Open Alerts & Acknowledge Flow:** Alert banners with one-tap `[ACK]` button that immediately updates backend (`PATCH /api/alerts/:id`) and triggers optimistic UI dismissal.
   - **4 Latest Reading Metrics:** Responsive 2x2 grid on mobile viewports (Temperature, Battery, Motion Index, Sequence Counter).
   - **Interactive 1-Hour Temperature Trend:** Dynamic SVG spline curve with gradient area fill, min/max point markers, and a 40.0°C alert threshold guideline.
   - **Chart / Table View Toggle:** Switch between graphical SVG curve and a **horizontally scrollable readings table** with aligned columns for timestamps, temperatures, battery levels, and sequence numbers.
   - **3-Axis Motion Telemetry Visualizer:** Visual meter bars for X, Y, Z axes across all 16 samples with vector gravity magnitude indication and sample selector pills (`S1`–`S16`).

### Configuration
All API connections are centralized in `mobile/src/config.js`:
```javascript
export const CONFIG = {
  API_BASE_URL: 'http://localhost:3000/api', // Overridable in-app via ⚙ API settings modal
  AUTO_REFRESH_INTERVAL_MS: 15000,
  REQUEST_TIMEOUT_MS: 8000
};
```

### Running the Mobile App:
```bash
# 1. Web Viewport (Production Bundle - Runs in any browser)
# Accessible automatically via the backend server at: http://localhost:3000/
# To rebuild the static web bundle:
cd mobile
npm install
npm run build

# 2. Native Mobile (Expo Go on physical phone or Android/iOS Emulator):
cd mobile
npm start
# Press 'a' for Android emulator, 'w' for web, or scan the QR code with Expo Go!
```

---

## ⚡ High-Scale Architecture Note (50,000 Devices)

### The Scale Challenge
- **Device Count:** 50,000 devices
- **Transmission Rate:** 1 packet every 15 seconds
- **Throughput:** `50,000 / 15` = **~3,333 packets/second** (plus ~1,600 duplicate forwards = **~5,000 req/sec**).
- **Ingress Bandwidth:** `5,000 req/sec * 1.2 KB` = **~6 MB/second (~48 Mbps)**.
- **Daily Volume:** `288,000,000` readings/day (~70 GB raw/day).

### Proposed Production Architecture

```
[ 50,000 Field Devices ]
         │
         ▼
[ Cloud Load Balancer (AWS ALB / Cloudflare) ]
         │
         ▼
[ Ingestion Gateway Layer (Go / Rust / Node.js Cluster) ]
  • TLS Termination & Gateway API Key Auth
  • AES-256-GCM Decryption (Hardware AES-NI acceleration)
  • Deduplication Check: Redis Bloom Filter / Sliding Window
         │
         ▼ (Buffered via Partition Key = device_id)
[ Distributed Message Broker: Apache Kafka / AWS Kinesis ]
         │
    ┌────┴────────────────────────┬──────────────────────┐
    ▼                             ▼                      ▼
[ Telemetry Storage Worker ]  [ Alert Engine ]     [ Real-time Stream ]
  • Batch inserts into          • Apache Flink /     • Redis Pub/Sub
    TimescaleDB or ClickHouse     Redis Streams        WebSocket Hub
  • Partitioned by device_id    • Sliding 1-hr       • Real-time push
    and time chunks               aggregations         to mobile apps
```

1. **Ingress Decoupling:** Ingest workers do NOT write directly to the primary database. They decrypt, run a quick duplicate check against Redis (`SET device:seq EX 120 NX`), and push into a partitioned Kafka topic.
2. **Specialized Time-Series Storage:** Use **ClickHouse** or **TimescaleDB** with columnar compression. 16 motion samples compressed with ZSTD achieve >80% storage savings.
3. **Stateful Alert Evaluation:** Use **Apache Flink** or Redis time-series sliding windows for the 1-hour average activity score calculation instead of querying SQL on every packet.
4. **Caching & Mobile Read Layer:** Redis cache holds the "latest state" of all 50,000 devices in hash maps (`HSET device:{id}`), allowing `GET /api/devices` to return sub-10ms responses without touching disk.

---

## 🎁 Bonus Tasks Implemented (+10 Points)

All 5 bonus tasks listed in the assignment brief are implemented and verified:

1. **Simple Authentication (Gateway API Key & App User Login):**
   - **Gateway Auth:** `POST /api/ingest` supports `X-API-Key` / `Authorization` header verification with configurable enforcement (`GATEWAY_API_KEY`).
   - **App User Login:** Dedicated `POST /api/auth/login` and `GET /api/auth/me` endpoints issue session tokens for operators (`operator` / `password123`) and engineers.
2. **Docker Compose (One-Command Startup):**
   - Standalone `docker-compose.yml` and multi-stage `Dockerfile` boots the backend and persistent database volume with healthcheck probes via `docker-compose up --build`.
3. **Push Notification on Over-Temperature Alert:**
   - Dedicated notification dispatch service (`/api/notifications`) raises real-time critical push events when a device breaches 40.0°C.
   - The mobile application immediately displays an interactive red push alert banner at the top of the command console with one-tap deep navigation to the overheating node (`SN-70003`).
4. **Zero-Downtime Key Rotation:**
   - The decryption engine in `backend/src/services/decryption.js` accepts packets encrypted with either the active `AES_KEY` or the previous `AES_KEY_OLD` (or comma-delimited key list) without dropping packets during key rollouts. Covered by automated unit tests.
5. **High-Scale Architecture Design (50,000 Devices):**
   - Detailed production architecture plan in [Section 9](#high-scale-architecture-note-50000-devices) detailing Kafka partitioning, Redis sliding-window deduplication, ClickHouse columnar storage, and Redis hash caching for 5,000 req/sec throughput.

---

## 📝 Assumptions & Design Decisions

1. **Device Clock vs Server Clock:** Per assignment rule ("Use the packet timestamp, not the server clock, for all rules"), all alert calculations and time-range filters use the device clock timestamp.
2. **Auto-Registration of Unknown Devices:** Packets arriving from unregistered device IDs are accepted, decrypted, stored in `readings`, and automatically registered in `devices` with an `Auto-registered` tag.
3. **Duplicate Packet Storage:** Duplicate packets (same device ID and sequence number within 2 minutes) are stored in `encrypted_packets` for audit integrity, but their reading is omitted from `readings` and alert checks are skipped.
4. **Inactive Threshold Selection (5.0 mg):** Resting gravity reads ~1000 mg. Minor sensor noise creates ±5–10 mg fluctuations. A threshold of 5.0 mg accurately identifies stationary devices (such as `SN-70004` which averages 1.43–1.66 mg) while preventing false alerts on moving hardware.

---

## 🔮 What I Would Improve With More Time

1. **Real-Time WebSocket / SSE Streaming:** Replace 15-second client polling with Server-Sent Events (SSE) or WebSockets so telemetry waveforms, temperature curves, and incoming alerts update on phone screens in sub-100ms real-time.
2. **Native Push Notifications (FCM / APNs):** Integrate Firebase Cloud Messaging and Apple APNs to immediately push high-priority critical alerts (such as over-temperature > 40°C or sudden offline silence) to on-duty plant engineers even when the app is backgrounded.
3. **Time-Series Columnar Storage & Downsampling:** Migrate long-term historical readings from SQLite to TimescaleDB or ClickHouse. Add continuous aggregate rollups (1-minute, 1-hour, 1-day averages) so years of historical telemetry can be rendered instantly without downloading raw point data.
4. **Spectral Vibration Analysis (FFT on 3-Axis Samples):** Implement Fast Fourier Transform (FFT) analysis on the 16 accelerometer samples to detect motor vibration frequency peaks and predict bearing failures days before mechanical standstill.
5. **Mutual TLS (mTLS) & Hardware Security Module (HSM):** Implement mutual TLS client certificates for gateway authentication and store master AES encryption keys in AWS KMS or HashiCorp Vault with automated key rotation schedules.
