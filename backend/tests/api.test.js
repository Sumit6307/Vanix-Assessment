/**
 * API Integration and Alert Tests
 * Tests all REST endpoints, duplicate handling, and alert triggers
 */

process.env.AES_KEY = '04f4848ce46f9384da9b2f915dcb3bd5e9ea218e7e415776d85393391dcbe775';

const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const cors = require('cors');

const testDbPath = path.join(__dirname, '..', 'data', 'test_api.db');

// Ensure clean test DB
if (fs.existsSync(testDbPath)) {
  try { fs.unlinkSync(testDbPath); } catch (e) {}
}

const { initDB, closeDB, getDB } = require('../src/db');
initDB(testDbPath);

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/ingest', require('../src/routes/ingest'));
app.use('/api/devices', require('../src/routes/devices'));
app.use('/api/alerts', require('../src/routes/alerts'));
app.use('/api/auth', require('../src/routes/auth'));
app.use('/api/notifications', require('../src/routes/notifications'));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

let server;
let baseUrl;

// Sample row 1 encrypted packet from assignment
const SAMPLE_ROW_1_ENCRYPTED = {
  gatewayId: "GW-01",
  iv: "2VsiomiGKk15dp3c",
  ciphertext: "AY5Q0YpLXruIDUikAE5mS/a87zr5MhlK4k9KNxBBiBsubkcpyoWNdAPfmp/JTyRVW98TPw/+XICqxURBTFZMZELRREqbtJx6kNUpcFthFibKrcqkJxIMdJ78b0GPkENba3QDCyvWfWf/jyd+aAABBZofhWSY77btHk1c51MrJUWScCLYlz0JHBzEdNgNE15zHYl4e0z3v1PJ98jpzA/6iAV1H7aWqFj4OMkW+T5zwDe6e+rpdF8JTk1WSr7K0F9K7Br8XNeOxiHbb4b3djmMABJZ5WED4SuQj9kKSWKENyNzb93B4BJGXCWqf+sFwbtIlJmPksH752Q+EHu5xRrPalNyCPIdKDyBqRBHyLVZbj91XJWbt7EkXSaYl+9guzOiSaVlsQvbvvXJ+W8gqCu3ZXSWIR5iqBr/+B/b0OZIecaUCDkVpx+EynqgllCkm/rw0xvniZ+6Y06pDR0OUKdCv5hIqIjRfYdzSSaoiWydpdBQjdTfdzJIUAq7F3u5K0a8zM/TExTvxy8bKa7HCkufRyfur4bGgv+YHAnseD8RIo6eqUDLmc2K9iwFb+FCmGV83ePIp3bWY+p2LHrgGbws7hhapvjSYkUuBu3j57Rh5YQEbTmfDU99y20VwHRmsSvvA05opYH/sfZxi1oEZEo1JxVycmfdSfsc70gnoU+GJouQ/VlcTvIFkxUhdJZW+cN4rXHHbdcjXD4CSP7g1WtMQrtpzGFY5DUOq4naKwkcy7pLZg+tiiiXNTW0HvMhNvRlSuG7udMh8RbhVWBC/upwHXUjw1vF8weOyCW/ow3zq0udtsYkT0IGz8Ap594xjm9eEguIEcB+t1XNA+T26BJmf5/tcndqHDxpE+Ad15OCKjxJcQap4gkqlw==",
  tag: "mo1Z7GBs5ymzJ3kSJJXiRw=="
};

beforeAll((done) => {
  server = http.createServer(app);
  server.listen(0, () => {
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
    done();
  });
});

afterAll((done) => {
  server.close(() => {
    closeDB();
    try { fs.unlinkSync(testDbPath); } catch (e) {}
    done();
  });
});

describe('REST API - Core Endpoints', () => {
  test('GET /api/health should return ok', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('ok');
  });

  test('POST /api/devices should register a device', async () => {
    const res = await fetch(`${baseUrl}/api/devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: 70001,
        label: 'Sensor Alpha',
        location: 'Warehouse Bay 4'
      })
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.device_id).toBe(70001);
    expect(data.label).toBe('Sensor Alpha');
    expect(data.location).toBe('Warehouse Bay 4');
  });

  test('POST /api/devices should update existing device on re-registration', async () => {
    const res = await fetch(`${baseUrl}/api/devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: 70001,
        label: 'Sensor Alpha Updated',
        location: 'Cold Storage Room 1'
      })
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.label).toBe('Sensor Alpha Updated');
    expect(data.location).toBe('Cold Storage Room 1');
  });

  test('POST /api/ingest should ingest valid encrypted packet (returns 201)', async () => {
    const res = await fetch(`${baseUrl}/api/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(SAMPLE_ROW_1_ENCRYPTED)
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.status).toBe('ok');
    expect(json.decoded.deviceId).toBe(70003);
    expect(json.decoded.sequence).toBe(100);
    expect(json.decoded.temperature).toBeCloseTo(31.72, 2);
    expect(json.decoded.battery).toBe(91);
    expect(json.decoded.activityScore).toBeGreaterThanOrEqual(0);

    // Verify DB records
    const db = getDB();
    const rawEnc = db.prepare('SELECT * FROM encrypted_packets WHERE id = ?').get(json.encryptedPacketId);
    expect(rawEnc).toBeDefined();
    expect(rawEnc.gateway_id).toBe('GW-01');

    const rawDec = db.prepare('SELECT * FROM decrypted_packets WHERE encrypted_packet_id = ?').get(json.encryptedPacketId);
    expect(rawDec).toBeDefined();
    expect(JSON.parse(rawDec.plaintext).data).toHaveLength(256);

    const reading = db.prepare('SELECT * FROM readings WHERE id = ?').get(json.readingId);
    expect(reading).toBeDefined();
    expect(reading.device_id).toBe(70003);
  });

  test('POST /api/ingest should detect duplicates within 2 minutes (returns 200, status duplicate)', async () => {
    const res = await fetch(`${baseUrl}/api/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(SAMPLE_ROW_1_ENCRYPTED)
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('duplicate');
    expect(json.message).toContain('Duplicate packet detected');

    // Verify readings count has NOT increased
    const db = getDB();
    const readings = db.prepare('SELECT COUNT(*) as count FROM readings WHERE device_id = 70003').get();
    expect(readings.count).toBe(1);

    // But raw encrypted packet WAS stored for audit trail
    const encCount = db.prepare('SELECT COUNT(*) as count FROM encrypted_packets').get();
    expect(encCount.count).toBe(2);
  });

  test('POST /api/ingest should reject tampered ciphertext with HTTP 400', async () => {
    const tampered = {
      gatewayId: "GW-01",
      iv: "2VsiomiGKk15dp3c",
      ciphertext: "INVALID_TAMPERED_CIPHERTEXT_BASE64_XYZ==",
      tag: "mo1Z7GBs5ymzJ3kSJJXiRw=="
    };

    const res = await fetch(`${baseUrl}/api/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tampered)
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Bad request');
  });

  test('POST /api/ingest should reject missing required fields with HTTP 400', async () => {
    const res = await fetch(`${baseUrl}/api/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gatewayId: "GW-01" })
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Missing required fields');
  });

  test('GET /api/devices should list devices with latest reading and alert count', async () => {
    const res = await fetch(`${baseUrl}/api/devices`);
    expect(res.status).toBe(200);
    const devices = await res.json();

    expect(devices.length).toBeGreaterThanOrEqual(1);
    const dev70003 = devices.find(d => d.deviceId === 70003);
    expect(dev70003).toBeDefined();
    expect(dev70003.latestTemperature).toBeCloseTo(31.72, 2);
    expect(dev70003.latestBattery).toBe(91);
    expect(dev70003.lastSeenTimestamp).toBeGreaterThan(0);
  });

  test('GET /api/devices/:id should return single device details and stats', async () => {
    const res = await fetch(`${baseUrl}/api/devices/70003`);
    expect(res.status).toBe(200);
    const device = await res.json();

    expect(device.deviceId).toBe(70003);
    expect(device.latestReading).toBeDefined();
    expect(device.latestReading.sequence).toBe(100);
    expect(device.latestReading.temperature).toBeCloseTo(31.72, 2);
    expect(device.stats).toBeDefined();
    expect(device.stats.totalReadings).toBe(1);
  });

  test('GET /api/devices/:id/readings should return paginated readings with time filters', async () => {
    const res = await fetch(`${baseUrl}/api/devices/70003/readings?page=1&limit=10`);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBe(1);
    expect(json.pagination).toBeDefined();
    expect(json.pagination.page).toBe(1);
    expect(json.pagination.total).toBe(1);

    // Test out of range filter
    const resEmpty = await fetch(`${baseUrl}/api/devices/70003/readings?from=0&to=100`);
    const emptyJson = await resEmpty.json();
    expect(emptyJson.data.length).toBe(0);
  });
});

describe('Alert Rules and Management', () => {
  const { checkAlerts, checkOfflineAlerts } = require('../src/services/alerts');

  test('should raise over-temperature alert when temperature > 40.00 °C', async () => {
    const highTempPacket = {
      deviceId: 70002,
      sequence: 12,
      timestamp: 1791180200,
      temperature: 42.85,
      battery: 85,
      label: 'SN-70002',
      samples: Array.from({ length: 16 }, () => ({ x: 0, y: 0, z: 1000 })),
      activityScore: 2.0
    };

    checkAlerts(highTempPacket);

    const res = await fetch(`${baseUrl}/api/alerts?status=open`);
    expect(res.status).toBe(200);
    const alerts = await res.json();

    const overTempAlert = alerts.find(a => a.deviceId === 70002 && a.type === 'over_temperature');
    expect(overTempAlert).toBeDefined();
    expect(overTempAlert.message).toContain('42.85°C exceeds threshold of 40');
    expect(overTempAlert.acknowledged).toBe(false);
  });

  test('should not raise duplicate open alert for same device and type', async () => {
    const highTempPacket2 = {
      deviceId: 70002,
      sequence: 13,
      timestamp: 1791180215,
      temperature: 43.10,
      battery: 84,
      label: 'SN-70002',
      samples: Array.from({ length: 16 }, () => ({ x: 0, y: 0, z: 1000 })),
      activityScore: 2.0
    };

    checkAlerts(highTempPacket2);

    const res = await fetch(`${baseUrl}/api/alerts?status=open`);
    const alerts = await res.json();
    const openForDevice = alerts.filter(a => a.deviceId === 70002 && a.type === 'over_temperature');
    expect(openForDevice.length).toBe(1);
  });

  test('should acknowledge alert via PATCH /api/alerts/:id', async () => {
    const openRes = await fetch(`${baseUrl}/api/alerts?status=open`);
    const alerts = await openRes.json();
    const alertToAck = alerts[0];
    expect(alertToAck).toBeDefined();

    const patchRes = await fetch(`${baseUrl}/api/alerts/${alertToAck.id}`, {
      method: 'PATCH'
    });
    expect(patchRes.status).toBe(200);
    const acked = await patchRes.json();
    expect(acked.acknowledged).toBe(true);
    expect(acked.acknowledgedAt).toBeDefined();

    // Verify it is no longer listed under status=open
    const openResAfter = await fetch(`${baseUrl}/api/alerts?status=open`);
    const alertsAfter = await openResAfter.json();
    expect(alertsAfter.some(a => a.id === alertToAck.id)).toBe(false);
  });

  test('should raise offline alert when device has sent nothing for 30 minutes', async () => {
    // Current latest time is 1791180200 + 35 minutes = 1791180200 + 2100 = 1791182300
    const simTime = 1791180200 + 2100;
    checkOfflineAlerts(simTime);

    const res = await fetch(`${baseUrl}/api/alerts?status=open`);
    const alerts = await res.json();
    const offlineAlert = alerts.find(a => a.type === 'offline');
    expect(offlineAlert).toBeDefined();
    expect(offlineAlert.message).toContain('Device has not sent data');
  });
});

describe('Bonus Features - Authentication & Push Notifications', () => {
  test('should authenticate app user via POST /api/auth/login', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'operator', password: 'password123' })
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.token).toBeDefined();
    expect(data.user.role).toBe('Plant Operator');
  });

  test('should reject invalid credentials via POST /api/auth/login', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'bad', password: 'bad' })
    });
    expect(res.status).toBe(401);
  });

  test('should retrieve push notifications via GET /api/notifications', async () => {
    const res = await fetch(`${baseUrl}/api/notifications`);
    expect(res.status).toBe(200);
    const notifs = await res.json();
    expect(Array.isArray(notifs)).toBe(true);
    // Should contain over-temperature push notification
    const overTempNotif = notifs.find(n => n.type === 'over_temperature');
    expect(overTempNotif).toBeDefined();
    expect(overTempNotif.priority).toBe('critical');
  });
});

