/**
 * Replay Script
 * Replays encrypted_packets.json to POST /api/ingest in sentAt order
 * 
 * Usage:
 *   node scripts/replay.js                    # Real-time replay
 *   node scripts/replay.js --speed 60         # 60x speed (1 hour → 1 minute)
 *   node scripts/replay.js --speed 0          # As fast as possible (no delays)
 *   node scripts/replay.js --file path/to/file.json  # Custom file path
 * 
 * The script preserves the relative timing between packets from the sample data.
 * At 60x speed, the full hour of data replays in about 1 minute.
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
let speed = 1;
let filePath = path.join(__dirname, '..', '..', 'encrypted_packets.json');
let apiUrl = 'http://localhost:3000/api/ingest';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--speed' && args[i + 1]) {
    speed = parseFloat(args[i + 1]);
    i++;
  } else if (args[i] === '--file' && args[i + 1]) {
    filePath = args[i + 1];
    i++;
  } else if (args[i] === '--url' && args[i + 1]) {
    apiUrl = args[i + 1];
    i++;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function replay() {
  console.log(`[REPLAY] Loading packets from: ${filePath}`);
  console.log(`[REPLAY] Target API: ${apiUrl}`);
  console.log(`[REPLAY] Speed: ${speed}x${speed === 0 ? ' (no delays)' : ''}`);
  console.log('');

  // Load the encrypted packets file
  const raw = fs.readFileSync(filePath, 'utf-8');
  const packets = JSON.parse(raw);

  console.log(`[REPLAY] Loaded ${packets.length} packets`);

  // Sort by sentAt to ensure correct order
  packets.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());

  const startReal = Date.now();
  const startSim = new Date(packets[0].sentAt).getTime();

  let success = 0;
  let duplicates = 0;
  let errors = 0;

  for (let i = 0; i < packets.length; i++) {
    const packet = packets[i];
    const packetTime = new Date(packet.sentAt).getTime();

    // Calculate delay based on speed
    if (speed > 0 && i > 0) {
      const prevTime = new Date(packets[i - 1].sentAt).getTime();
      const timeDiff = packetTime - prevTime;
      const delayMs = timeDiff / speed;

      if (delayMs > 0) {
        await sleep(delayMs);
      }
    }

    // Send the packet
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(packet.body)
      });

      const result = await response.json();

      if (response.status === 201) {
        success++;
        const decoded = result.decoded;
        if (decoded) {
          process.stdout.write(
            `\r[${i + 1}/${packets.length}] ✓ Device ${decoded.deviceId} seq=${decoded.sequence} temp=${decoded.temperature?.toFixed(2)}°C bat=${decoded.battery}%  `
          );
        }
      } else if (response.status === 200 && result.status === 'duplicate') {
        duplicates++;
        process.stdout.write(
          `\r[${i + 1}/${packets.length}] ↔ Duplicate device=${result.decoded?.deviceId} seq=${result.decoded?.sequence}  `
        );
      } else {
        errors++;
        process.stdout.write(
          `\r[${i + 1}/${packets.length}] ✗ Error: ${result.error || result.details || 'Unknown'}  `
        );
      }
    } catch (error) {
      errors++;
      process.stdout.write(
        `\r[${i + 1}/${packets.length}] ✗ Network error: ${error.message}  `
      );
    }
  }

  const elapsed = ((Date.now() - startReal) / 1000).toFixed(1);

  console.log('\n');
  console.log('═══════════════════════════════════════');
  console.log('           REPLAY COMPLETE             ');
  console.log('═══════════════════════════════════════');
  console.log(`  Total packets:  ${packets.length}`);
  console.log(`  New readings:   ${success}`);
  console.log(`  Duplicates:     ${duplicates}`);
  console.log(`  Errors:         ${errors}`);
  console.log(`  Time elapsed:   ${elapsed}s`);
  console.log('═══════════════════════════════════════');

  // Fetch and display alerts summary
  try {
    const alertsRes = await fetch('http://localhost:3000/api/alerts?status=open');
    const alerts = await alertsRes.json();
    if (alerts.length > 0) {
      console.log('');
      console.log('  🚨 OPEN ALERTS:');
      for (const alert of alerts) {
        const icon = alert.type === 'over_temperature' ? '🌡️' :
                     alert.type === 'offline' ? '📡' : '🔇';
        console.log(`  ${icon} [${alert.type}] Device ${alert.deviceId}: ${alert.message}`);
      }
    } else {
      console.log('  ✅ No open alerts');
    }
  } catch (e) {
    // Ignore if we can't fetch alerts
  }

  // Fetch and display device summary
  try {
    const devicesRes = await fetch('http://localhost:3000/api/devices');
    const devices = await devicesRes.json();
    if (devices.length > 0) {
      console.log('');
      console.log('  📊 DEVICE SUMMARY:');
      for (const d of devices) {
        const temp = d.latestTemperature != null ? `${d.latestTemperature.toFixed(2)}°C` : 'N/A';
        const bat = d.latestBattery != null ? `${d.latestBattery}%` : 'N/A';
        const alertBadge = d.openAlerts > 0 ? ` 🔴 ${d.openAlerts} alert(s)` : '';
        console.log(`  • ${d.label} (${d.deviceId}): ${temp}, bat=${bat}${alertBadge}`);
      }
    }
  } catch (e) {
    // Ignore
  }

  console.log('');
}

replay().catch(err => {
  console.error('[REPLAY FATAL]', err);
  process.exit(1);
});
