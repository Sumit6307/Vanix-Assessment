# Vanix IoT Telemetry & Alert Sentinel

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Live%20App-success?logo=vercel&style=for-the-badge)](https://vanix-assessment-mobile.vercel.app/)
[![Render API](https://img.shields.io/badge/Render-Live%20Backend-46E3B7?logo=render&style=for-the-badge)](https://vanix-iot-backend.onrender.com/api)
[![Loom Walkthrough](https://img.shields.io/badge/Loom-Video%20Demo-625DF5?logo=loom&style=for-the-badge)](https://www.loom.com/share/711abafc1a9b48378e931d07608397bd)
[![Tests Passing](https://img.shields.io/badge/Tests-48%2F48%20Passed%20(100%25)-brightgreen?style=for-the-badge)](./backend/tests)

An enterprise-grade, end-to-end IoT ingestion backend and 100% responsive mobile monitoring application. The system securely ingests AES-256-GCM encrypted field packets, decrypts and parses 256-byte binary sensor telemetry, detects duplicate forwardings, evaluates real-time alert rules, stores time-series readings, and serves a high-performance REST API to a mobile monitoring application.

---

## 🌐 Live Deployments & Demo Video

| Resource | Direct Link | Description |
| :--- | :--- | :--- |
| **🚀 Live Mobile Web App** | [https://vanix-assessment-mobile.vercel.app/](https://vanix-assessment-mobile.vercel.app/) | Deployed on **Vercel** — 100% responsive (mobile, tablet, desktop). |
| **⚡ Live REST API Backend** | [https://vanix-iot-backend.onrender.com/api](https://vanix-iot-backend.onrender.com/api) | Deployed on **Render** with active endpoints & automated health checks. |
| **🎥 Video Walkthrough (Loom)** | [https://www.loom.com/share/711abafc1a9b48378e931d07608397bd](https://www.loom.com/share/711abafc1a9b48378e931d07608397bd) | **3–4 minute walkthrough**: replay streaming, live alerts, and one-tap acknowledge. |

---

## 📑 Table of Contents
1. [Architecture Overview](#-architecture-overview)
2. [Setup Steps](#-setup-steps)
3. [How to Run Tests](#-how-to-run-tests)
4. [Sample Dataset Analysis & Findings](#-sample-dataset-analysis--findings)
5. [Decryption & Binary Packet Decoder](#-decryption--binary-packet-decoder)
6. [Database Schema & Data Modeling](#-database-schema--data-modeling)
7. [REST API Documentation](#-rest-api-documentation)
8. [How to Run the Replay Script](#-how-to-run-the-replay-script)
9. [Mobile Application](#-mobile-application)
10. [High-Scale Architecture Note (50,000 Devices)](#-high-scale-architecture-note-50000-devices)
11. [Bonus Tasks Implemented](#-bonus-tasks-implemented-10-points)
12. [Assumptions & Design Decisions](#-assumptions--design-decisions)
13. [What I Would Improve With More Time](#-what-i-would-improve-with-more-time)

---

## 🏛 Architecture Overview

```
[ Field Sensor Node ]
   │ (Measures Temperature & 16x 3-Axis Accelerometer Samples)
   ▼
[ 256-byte Binary Packet ]
   │
   ▼
[ Gateway GW-01 ] ──► Encrypts with AES-256-GCM (12-byte IV + 16-byte Tag)
   │
   ▼ POST /api/ingest
┌─────────────────────────────────────────────────────────────────────────┐
│                          VANIX BACKEND SERVER                           │
│                                                                         │
│  1. Raw Packet Store ──► encrypted_packets (Audit Trail)                 │
│  2. AES-256-GCM Decrypt ──► decrypted_packets (Plaintext Hex / JSON)    │
│  3. Binary Decoder (Little-endian, Two's Complement, Checksum)          │
│  4. Deduplication Engine (2-minute sequence window, handles 255 wrap)   │
│  5. Metric Computation (Vector Activity Score from 16 samples)          │
│  6. Time-Series Store ──► readings & auto-registered devices            │
│  7. Rule Engine ──► alerts (Over-Temp, Inactive, Offline)               │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ REST API (JSON)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                MOBILE APPLICATION (React Native / Expo)                 │
│                 (100% Responsive: Mobile, Tablet, Desktop)              │
│                                                                         │
│  • Screen 1: Device List Screen (Fleet Command Center)                  │
│    - Status radar pills, temperature status tags, relative timestamps   │
│    - Inline navbar Over-Temperature push alert pill                     │
│    - 4-Card Executive KPI Overview (2x2 grid on mobile, 4-col desktop)  │
│    - Horizontal swipeable filter chips (All, Alerts, Sub-Zero, etc.)    │
│    - Native pull-to-refresh & in-app API config modal                   │
│                                                                         │
│  • Screen 2: Device Detail Screen                                       │
│    - Dedicated back navigation & node status pill                       │
│    - Active alert cards with one-tap "ACK" acknowledge flow             │
│    - 4 Latest reading metric cards in responsive 2x2 grid               │
│    - Interactive 1-hour SVG temperature spline chart (40°C threshold)   │
│    - Horizontally scrollable historical readings data table             │
│    - 3-Axis accelerometer motion telemetry visualizer (X, Y, Z mg)      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Setup Steps

### Prerequisites
- **Node.js**: v18+ (verified on Node v20, v22, and v24)
- **npm**: v9+
- *(Optional)* **Docker & Docker Compose**

---

### Method 1: Local Development Setup

#### 1. Clone Repository
```bash
git clone https://github.com/Sumit6307/Vanix-Assessment.git
cd Vanix-Assessment
```

#### 2. Start the Backend Server
```bash
# Navigate to the backend directory
cd backend

# Install dependencies
npm install

# Setup environment variables (default template includes AES key and port)
# On Linux/macOS:
cp .env.example .env
# On Windows PowerShell:
Copy-Item .env.example .env

# Start the server
npm start
```
The backend server runs at `http://localhost:3000`.  
- **REST API root:** `http://localhost:3000/api`  
- **Healthcheck:** `http://localhost:3000/api/health`

#### 3. Start the Mobile Application
Open a new terminal:
```bash
# Navigate to the mobile directory
cd Vanix-Assessment/mobile

# Install dependencies
npm install

# Option A: Run web client in browser (Recommended for instant evaluation)
npm run web
# Opens at: http://localhost:8081

# Option B: Run native client (Expo Go on iOS/Android or emulator)
npm start
# Press 'a' for Android emulator, or scan the QR code using Expo Go app on your phone!

# Option C: Build static web bundle
npm run build
```

---

### Method 2: Docker Compose (One-Command Startup)

From the project root:
```bash
docker-compose up --build
```
This automatically builds and boots the containerized backend server on port `3000` with persistent SQLite database storage and built-in health probes.

---

## 🧪 How to Run Tests

The test suite validates **all requirements** across unit, integration, and security layers.

### Run Tests:
```bash
cd backend
npm test
```

### What the Test Suite Verifies:
1. **AES-256-GCM Decryption:**
   - 16-byte authentication tag verification.
   - Tampered ciphertext rejection with explicit error responses.
   - Zero-downtime key rotation (fallback to previous key during changeovers).
2. **Binary Packet Decoding:**
   - Exact bit-for-bit decoding of assignment sample packet 8.
   - Cross-validation against 10+ rows from `sample_data.db`.
   - Little-endian byte order for 32-bit and 64-bit integers.
   - Signed two's complement parsing for sub-zero temperature values.
   - 16-bit checksum verification (sum of bytes 0–251 mod 65536).
3. **Deduplication Engine:**
   - 2-minute sequence window duplicate suppression.
   - Sequence number wrap-around handling (255 → 0).
4. **Alert Rule Engine:**
   - Over-temperature alert (> 40.0°C).
   - Inactivity alert (< 5.0 mg average motion deviation).
   - Offline alert (30 minutes of transmission silence).
   - Acknowledgment workflow (`PATCH /api/alerts/:id`).
5. **REST API Endpoints:**
   - Full integration tests on `/api/ingest`, `/api/devices`, `/api/alerts`, and `/api/health`.

### Test Execution Output:
```text
PASS tests/packet.test.js
PASS tests/api.test.js

Test Suites: 2 passed, 2 total
Tests:       48 passed, 48 total
Snapshots:   0 total
Time:        19.852 s
Ran all test suites.
```
**Result: 48 passed out of 48 tests across all suites (100% passing).**

---

## 🔍 Sample Dataset Analysis & Findings

Replaying `encrypted_packets.json` (1,574 transmissions over 1 hour across 5 devices) reveals all operational behaviors seeded into the test dataset:

| Device ID | Hardware Label | Operational Behavior in Dataset | Triggered Alerts |
| :--- | :--- | :--- | :--- |
| **70001** | `SN-70001` | **Nominal Baseline:** Stable temperature (31.2°C–31.7°C), active vibration, 97% battery. | None (Nominal) |
| **70002** | `SN-70002` | **Sub-Zero Freezing:** Operates consistently below freezing (**-6.79°C to -6.21°C**). Handled via signed two's complement `int16`. | None |
| **70003** | `SN-70003` | **Overheating Device:** Temperature steadily climbs from 31.7°C to **43.47°C**, crossing the 40.0°C safety threshold at 06:51:16 UTC. | 🚨 `over_temperature` |
| **70004** | `SN-70004` | **Inactive / Stopped Moving:** Vector magnitude deviation drops to **1.43–1.66 mg** (near resting gravity 1000 mg), well below the 5.0 mg threshold. | 🚨 `inactive` |
| **70005** | `SN-70005` | **Device Going Offline:** Stops sending telemetry at **06:19:54 UTC**. After 30 minutes of silence (06:49:54 UTC), an alert is raised. | 🚨 `offline` |

### Packet Deduplication & Sequence Wrapping
- **Total Encrypted Packets:** 1,574
- **Unique Readings Stored:** 1,041
- **Duplicates Filtered:** 533 (forwarded copies from gateway rejected within the 2-minute sequence window)
- **Sequence Wrapping:** Devices cycle sequence counters from `255` wrap-around back to `0` cleanly without losing telemetry continuity.

---

## 🔐 Decryption & Binary Packet Decoder

### AES-256-GCM Decryption (`backend/src/services/decryption.js`)
- **Key:** Loaded from environment variable `AES_KEY` (64-character hex string representing a 256-bit key).
- **IV:** 12-byte initialization vector (hex-encoded from gateway transmission).
- **Tag:** 16-byte GCM authentication tag. If authentication fails or ciphertext is tampered with, `crypto.createDecipheriv` throws an exception, returning `400 Bad Request`.
- **Zero-Downtime Key Rotation:** Supports comma-separated keys or `AES_KEY_OLD` fallback during key rollout cycles.

### 256-Byte Binary Packet Structure (`backend/src/services/decoder.js`)
All values use **little-endian byte order**:

| Byte Offset | Field | Type | Description |
| :--- | :--- | :--- | :--- |
| `0..3` (4B) | Device ID | `uint32_le` | Unique hardware identifier (e.g. 70001) |
| `4` (1B) | Sequence Number | `uint8` | Increments 0–255, wrapping back to 0 |
| `5..12` (8B) | Timestamp | `int64_le` | Unix epoch timestamp in seconds |
| `13..14` (2B) | Temperature | `int16_le` | Signed two's complement, divided by 100.0 (°C) |
| `15` (1B) | Battery Level | `uint8` | Battery charge percentage (0–100%) |
| `16..31` (16B) | Device Label | `char[16]` | ASCII string, null-terminated or null-padded |
| `32..127` (96B)| Accelerometer Samples | `16 x int16[3]` | 16 samples of X, Y, Z acceleration in milli-g |
| `128..251` (124B)| Reserved / Padding | `uint8[124]` | Unused padding bytes |
| `252..253` (2B)| Checksum | `uint16_le` | Sum of bytes 0–251 mod 65536 |
| `254..255` (2B)| Packet End | `uint8[2]` | Magic marker bytes `0xAA, 0x55` |

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

-- Strategic Query Indexes
CREATE INDEX idx_readings_device_time ON readings(device_id, timestamp);
CREATE INDEX idx_alerts_device_status ON alerts(device_id, acknowledged);
CREATE INDEX idx_alerts_time ON alerts(time_raised);
```

### Why Motion Samples are Stored as a JSON Array
Each packet contains 16 motion samples (X, Y, Z in milli-g):
1. **Query Pattern:** The mobile application and analysis tools always fetch all 16 samples together for a reading (to plot waveform charts or compute FFT). Individual sample #7 is never queried independently.
2. **Performance & Row Explosion:** Normalizing into a child table creates a 16x row explosion (1,041 readings = 16,656 child rows per hour). Joining this table on every reading query degrades performance without query benefits.
3. **Transaction Atomicity:** Telemetry is stored in a single atomic `INSERT` transaction and served to clients in a single fast indexed row lookup.

---

## 📡 REST API Documentation

- **Base URL (Local):** `http://localhost:3000/api`  
- **Base URL (Cloud):** `https://vanix-iot-backend.onrender.com/api`

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

## ⏩ How to Run the Replay Script

The replay script simulates real-time field traffic by streaming `encrypted_packets.json` to `POST /api/ingest`.

> [!NOTE]
> The replay script is located in `backend/scripts/replay.js`. You can run it either from the **root directory** or from the **backend directory**.

### Option A: From the Root Directory (`Vanix-Assessment/`)
```bash
# 1. Stream to Local Backend (60x speed: 1 hour in 1 minute)
node backend/scripts/replay.js --speed 60

# 2. Stream to Live Cloud Backend on Render
node backend/scripts/replay.js --speed 60 --url https://vanix-iot-backend.onrender.com/api/ingest

# 3. Maximum Speed (instant benchmark, no delays)
node backend/scripts/replay.js --speed 0 --url https://vanix-iot-backend.onrender.com/api/ingest
```

### Option B: From the `backend/` Directory
```bash
cd backend

# Stream to Local Backend (60x speed)
node scripts/replay.js --speed 60

# Stream to Live Cloud Backend on Render
node scripts/replay.js --speed 60 --url https://vanix-iot-backend.onrender.com/api/ingest
```

---

## 📱 Mobile Application

The mobile app is built with **React Native / Expo** in `mobile/` and is **100% responsive** across smartphones (360px+), tablets, and desktop displays.

### Screens & UI Architecture:
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
  API_BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api',
  AUTO_REFRESH_INTERVAL_MS: 15000,
  REQUEST_TIMEOUT_MS: 8000
};
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
   - The mobile application immediately displays an interactive alert pill in the top command navbar with one-tap deep navigation to the overheating node (`SN-70003`).
4. **Zero-Downtime Key Rotation:**
   - The decryption engine in `backend/src/services/decryption.js` accepts packets encrypted with either the active `AES_KEY` or the previous `AES_KEY_OLD` (or comma-delimited key list) without dropping packets during key rollouts. Covered by automated unit tests.
5. **High-Scale Architecture Design (50,000 Devices):**
   - Detailed production architecture plan in [Section 10](#-high-scale-architecture-note-50000-devices) detailing Kafka partitioning, Redis sliding-window deduplication, ClickHouse columnar storage, and Redis hash caching for 5,000 req/sec throughput.

---

## 📝 Assumptions & Design Decisions

1. **Device Clock vs Server Clock:**  
   Per the core requirement (*"Use the packet timestamp, not the server clock, for all rules"*), all time-series storage, alert evaluation, and historical range queries rely strictly on the 64-bit integer timestamp decoded from the binary packet payload.
2. **Deduplication Window & Modulo 256 Sequence Wrapping:**  
   The field gateway occasionally forward-duplicates identical packets within a short window. A packet is classified as duplicate if another packet with the exact same `device_id` and `sequence_number` was ingested within the past 2 minutes (`120 seconds`). The sequence counter is an 8-bit unsigned integer (`0..255`) that wraps from `255` back to `0`. Comparing both sequence and time window ensures normal wrapping after 256 transmissions is not falsely dropped as a duplicate.
3. **Inactive Motion Threshold Selection (5.0 mg):**  
   Earth's resting gravitational field exerts ~1000 mg of baseline acceleration. Natural sensor noise produces small variations of ±2–4 mg even when resting on a stable table. A threshold of 5.0 mg standard deviation across vector magnitude safely distinguishes active machine vibration from complete operational standstill (e.g., `SN-70004` which drops to 1.43–1.66 mg).
4. **Signed Two's Complement for Sub-Zero Temperature:**  
   Temperature is decoded as a signed 16-bit little-endian integer (`readInt16LE`) divided by `100.0`. This correctly preserves negative Celsius temperatures (e.g., `SN-70002` operating at -6.78°C in cold-chain storage) without unsigned overflow errors.
5. **Auto-Registration of Unseen Devices:**  
   When a packet from an unprovisioned hardware ID is decrypted successfully, the backend automatically registers the device in the `devices` table with default label metadata, ensuring immediate visibility in the fleet dashboard without manual database pre-seeding.
6. **Audit Trail Preservation:**  
   Raw encrypted payloads are preserved in `encrypted_packets` alongside gateway ID and IV for non-repudiation and security auditing, even if payload parsing or duplicate rejection occurs downstream.

---

## 🔮 What I Would Improve With More Time

1. **Real-Time WebSocket / SSE Streaming:**  
   Replace client polling with Server-Sent Events (SSE) or WebSockets so that telemetry curves, motion readings, and incoming alerts update on phone screens in sub-100ms real-time as packets arrive.
2. **Native Push Notifications (FCM / APNs):**  
   Integrate Firebase Cloud Messaging (FCM) and Apple Push Notification Service (APNs) so that critical over-temperature (>40.0°C) and machine offline alarms trigger audible high-priority notifications on plant operators' mobile devices even when the app is backgrounded or the phone is locked.
3. **Time-Series Columnar Storage & Downsampling:**  
   Migrate long-term storage from SQLite to TimescaleDB or ClickHouse. Implement automated continuous aggregates (1-minute, 1-hour, and 1-day rollups) so querying multi-month historical trends remains instantaneous without transferring millions of raw data points.
4. **Spectral Vibration Analysis (FFT on 3-Axis Samples):**  
   Apply Fast Fourier Transform (FFT) on the 16 accelerometer samples to compute peak vibration frequencies and harmonic distortion, enabling predictive maintenance algorithms to flag motor bearing wear days before mechanical breakdown.
5. **Mutual TLS (mTLS) & Hardware Security Module (HSM):**  
   Enforce mutual TLS client certificates at the gateway layer and integrate with AWS KMS or HashiCorp Vault for automated periodic AES key rotation and secure hardware key storage.
6. **Automated End-to-End (E2E) Browser & Mobile Tests:**  
   Add Playwright or Detox automated test runs to continuously verify the acknowledgment flow, chart interactions, and responsive UI layouts across iOS, Android, and Desktop browsers on every commit.

---

## 👤 Author & Submission Details
- **Candidate:** Sumit Kumar
- **Repository:** [https://github.com/Sumit6307/Vanix-Assessment](https://github.com/Sumit6307/Vanix-Assessment)
- **Live Mobile Web App:** [https://vanix-assessment-mobile.vercel.app/](https://vanix-assessment-mobile.vercel.app/)
- **Live Backend API:** [https://vanix-iot-backend.onrender.com/api](https://vanix-iot-backend.onrender.com/api)
- **Loom Walkthrough Video:** [https://www.loom.com/share/711abafc1a9b48378e931d07608397bd](https://www.loom.com/share/711abafc1a9b48378e931d07608397bd)
